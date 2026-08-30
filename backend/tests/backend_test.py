"""ClassOS backend API tests: health, session lifecycle, scribe-token security, transcript persistence."""
import os
import re
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

backend_env = dotenv_values("/app/backend/.env")
ELEVEN_KEY = backend_env.get("ELEVENLABS_API_KEY")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _create(api, mode="real", title="TEST_class", subject="TEST_subject"):
    r = api.post(f"{BASE_URL}/api/sessions", json={"title": title, "subject": subject, "mode": mode}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Health ----------
class TestHealth:
    def test_health(self, api):
        r = api.get(f"{BASE_URL}/api/health", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "ok"
        assert d["database"] == "connected"
        assert d["service"] == "ClassOS API"
        assert "_id" not in d


# ---------- Session lifecycle ----------
class TestSessionLifecycle:
    @pytest.mark.parametrize("mode", ["real", "demo"])
    def test_full_lifecycle(self, api, mode):
        s = _create(api, mode)
        sid = s["id"]
        assert s["status"] == "live"
        assert s["mode"] == mode
        assert s["title"] == "TEST_class"
        assert s["subject"] == "TEST_subject"
        assert s["ended_at"] is None
        assert "_id" not in s

        g = api.get(f"{BASE_URL}/api/sessions/{sid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["status"] == "live"

        e = api.post(f"{BASE_URL}/api/sessions/{sid}/end", json={"duration_seconds": 42}, timeout=30)
        assert e.status_code == 200, e.text
        assert e.json()["status"] == "processing"
        assert e.json()["duration_seconds"] == 42

        f = api.post(f"{BASE_URL}/api/sessions/{sid}/finalize", timeout=30)
        assert f.status_code == 200, f.text
        assert f.json()["status"] == "complete"

        g = api.get(f"{BASE_URL}/api/sessions/{sid}", timeout=30).json()
        assert g["status"] == "complete"
        assert g["duration_seconds"] == 42

    def test_blank_title_becomes_null(self, api):
        s = _create(api, "demo", title="   ", subject="")
        assert s["title"] is None
        assert s["subject"] is None


# ---------- Scribe token security ----------
class TestScribeToken:
    def test_real_live_returns_token(self, api):
        s = _create(api, "real")
        r = api.post(f"{BASE_URL}/api/sessions/{s['id']}/scribe-token", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("token"), str)
        assert len(d["token"]) > 0
        # Permanent key must never be returned
        if ELEVEN_KEY:
            assert ELEVEN_KEY not in r.text
        assert "sk_" not in r.text

    def test_demo_session_400(self, api):
        s = _create(api, "demo")
        r = api.post(f"{BASE_URL}/api/sessions/{s['id']}/scribe-token", timeout=30)
        assert r.status_code == 400, r.text
        assert "Real Mode" in r.json()["detail"]

    def test_ended_session_409(self, api):
        s = _create(api, "real")
        api.post(f"{BASE_URL}/api/sessions/{s['id']}/end", json={"duration_seconds": 1}, timeout=30)
        r = api.post(f"{BASE_URL}/api/sessions/{s['id']}/scribe-token", timeout=30)
        assert r.status_code == 409, r.text

    def test_unknown_session_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/scribe-token", timeout=30)
        assert r.status_code == 404


# ---------- Key leakage ----------
class TestNoKeyLeak:
    def test_no_key_in_public_responses(self, api):
        s = _create(api, "real")
        urls = [
            ("GET", f"{BASE_URL}/api/health"),
            ("GET", f"{BASE_URL}/api/sessions/{s['id']}"),
            ("GET", f"{BASE_URL}/api/sessions/{s['id']}/transcript"),
        ]
        for method, url in urls:
            r = api.request(method, url, timeout=30)
            assert not re.search(r"sk_[A-Za-z0-9]{10,}", r.text), f"possible key leak in {url}"
            if ELEVEN_KEY:
                assert ELEVEN_KEY not in r.text, f"KEY LEAK in {url}"

    def test_classes_current_endpoint_state(self, api):
        """Endpoint referenced in the request; verify it either 404s (removed) or leaks nothing."""
        r = api.get(f"{BASE_URL}/api/classes/current", timeout=30)
        assert r.status_code in (200, 404, 405)
        if ELEVEN_KEY:
            assert ELEVEN_KEY not in r.text


# ---------- Transcript persistence ----------
class TestTranscript:
    def test_store_dedup_order_and_empty(self, api):
        s = _create(api, "real")
        sid = s["id"]

        chunks = [
            {"seq": 0, "text": "Hello class today.", "timestamp": "2026-07-01T10:00:00+00:00"},
            {"seq": 1, "text": "Price elasticity of demand.", "timestamp": "2026-07-01T10:00:05+00:00"},
            {"seq": 2, "text": "Any questions?", "timestamp": "2026-07-01T10:00:10+00:00"},
        ]
        for c in chunks:
            r = api.post(f"{BASE_URL}/api/sessions/{sid}/transcript", json=c, timeout=30)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["stored"] is True
            assert body["seq"] == c["seq"]

        # dedup: same seq again
        r = api.post(f"{BASE_URL}/api/sessions/{sid}/transcript", json=chunks[1], timeout=30)
        assert r.status_code == 200
        assert r.json()["stored"] is False

        # dedup with different text, same seq
        r = api.post(f"{BASE_URL}/api/sessions/{sid}/transcript",
                     json={"seq": 1, "text": "DIFFERENT TEXT"}, timeout=30)
        assert r.json()["stored"] is False

        # empty text
        r = api.post(f"{BASE_URL}/api/sessions/{sid}/transcript", json={"seq": 9, "text": "   "}, timeout=30)
        assert r.status_code == 200
        assert r.json()["stored"] is False
        assert r.json().get("reason") == "empty"

        # GET ordering + content
        g = api.get(f"{BASE_URL}/api/sessions/{sid}/transcript", timeout=30)
        assert g.status_code == 200
        gd = g.json()
        assert gd["session_id"] == sid
        got = gd["chunks"]
        assert len(got) == 3, got
        assert [c["seq"] for c in got] == [0, 1, 2]
        assert [c["text"] for c in got] == [c["text"] for c in chunks]
        assert got[1]["text"] == "Price elasticity of demand."  # original preserved
        assert got[0]["timestamp"] == chunks[0]["timestamp"]
        for c in got:
            assert "_id" not in c

    def test_out_of_order_seq_sorted(self, api):
        s = _create(api, "real")
        sid = s["id"]
        for seq, text in [(5, "five"), (1, "one"), (3, "three")]:
            api.post(f"{BASE_URL}/api/sessions/{sid}/transcript", json={"seq": seq, "text": text}, timeout=30)
        got = api.get(f"{BASE_URL}/api/sessions/{sid}/transcript", timeout=30).json()["chunks"]
        assert [c["seq"] for c in got] == [1, 3, 5]

    def test_transcript_unknown_session_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/transcript",
                     json={"seq": 0, "text": "hi"}, timeout=30)
        assert r.status_code == 404

    def test_transcript_missing_fields_422(self, api):
        s = _create(api, "real")
        r = api.post(f"{BASE_URL}/api/sessions/{s['id']}/transcript", json={"text": "hi"}, timeout=30)
        assert r.status_code == 422

    def test_get_transcript_empty_for_new_session(self, api):
        s = _create(api, "real")
        g = api.get(f"{BASE_URL}/api/sessions/{s['id']}/transcript", timeout=30)
        assert g.status_code == 200
        assert g.json()["chunks"] == []


# ---------- Error handling ----------
class TestErrors:
    def test_get_unknown_session_404(self, api):
        r = api.get(f"{BASE_URL}/api/sessions/{uuid.uuid4()}", timeout=30)
        assert r.status_code == 404
        assert r.json()["detail"] == "Session not found"

    def test_invalid_mode_422(self, api):
        r = api.post(f"{BASE_URL}/api/sessions", json={"mode": "bogus"}, timeout=30)
        assert r.status_code == 422

    def test_end_unknown_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/end", json={"duration_seconds": 1}, timeout=30)
        assert r.status_code == 404

    def test_finalize_unknown_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/finalize", timeout=30)
        assert r.status_code == 404
