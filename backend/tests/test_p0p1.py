"""ClassOS P0+P1 backend tests: catchup, expand, finalize (notes+quiz), regenerate, share, device scoping."""
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

LECTURE = [
    "Alright everyone, today we are working through the weighted average cost of capital, WACC.",
    "WACC is the blended rate a company pays to finance its assets, weighting equity and debt by market value.",
    "The formula is E over V times the cost of equity, plus D over V times the cost of debt times one minus the tax rate.",
    "Say equity is six hundred million and debt is four hundred million, so V is one billion, weights are sixty percent and forty percent.",
    "Cost of equity from CAPM: risk free of four percent, beta of one point two, market risk premium of five percent, so ten percent.",
    "Cost of debt is six percent pre-tax, and with a twenty-five percent tax rate the after-tax cost of debt is four point five percent.",
    "So WACC equals zero point six times ten percent plus zero point four times four point five percent, which is seven point eight percent.",
    "That seven point eight percent becomes the discount rate we use in a DCF for projects of similar risk.",
    "A common mistake is using book value weights instead of market value weights, which distorts the answer badly.",
    "Next class we will look at how changing capital structure moves beta, which is the unlevering and relevering step.",
]


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _create(api, mode="real", title="TEST_WACC", subject="TEST_Corporate Finance", device=None):
    headers = {"X-Device-Id": device} if device else {}
    r = api.post(f"{BASE_URL}/api/sessions",
                 json={"title": title, "subject": subject, "mode": mode},
                 headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def _post_lecture(api, sid, lines=LECTURE, start_seq=0, step=20):
    for i, text in enumerate(lines):
        r = api.post(f"{BASE_URL}/api/sessions/{sid}/transcript",
                     json={"seq": start_seq + i, "text": text, "at_seconds": (start_seq + i) * step},
                     timeout=30)
        assert r.status_code == 200, r.text


def _sentence_count(text):
    return len([s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()])


# ---------- Catch Me Up ----------
class TestCatchup:
    @pytest.fixture(scope="class")
    def live_session(self, api):
        s = _create(api, "real")
        _post_lecture(api, s["id"])
        return s

    def test_catchup_generates_grounded_summary(self, api, live_session):
        sid = live_session["id"]
        r = api.post(f"{BASE_URL}/api/sessions/{sid}/catchup", timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(["right_now", "how_we_got_here", "terms", "as_of_seconds"]).issubset(d.keys())
        assert isinstance(d["right_now"], str) and len(d["right_now"]) > 0
        assert isinstance(d["terms"], list) and len(d["terms"]) <= 2
        assert d["as_of_seconds"] == (len(LECTURE) - 1) * 20
        # <=3 sentences total across right_now + how_we_got_here
        total = _sentence_count(d["right_now"]) + (
            _sentence_count(d["how_we_got_here"]) if d.get("how_we_got_here") else 0)
        assert total <= 3, f"SPEC VIOLATION: {total} sentences (max 3): {d}"
        # grounded in the WACC lecture
        blob = (d["right_now"] + " " + (d.get("how_we_got_here") or "")).lower()
        for t in d["terms"]:
            assert isinstance(t.get("term"), str) and t["term"]
            assert isinstance(t.get("gloss"), str) and t["gloss"]
        assert any(k in blob for k in ["wacc", "cost of capital", "equity", "debt", "discount"]), blob

    def test_catchup_persists_running_summary(self, api, live_session):
        g = api.get(f"{BASE_URL}/api/sessions/{live_session['id']}", timeout=30)
        assert g.status_code == 200
        d = g.json()
        assert d.get("running_summary"), "running_summary not maintained"
        assert d.get("catchup_covered_seq") == len(LECTURE) - 1
        assert d.get("catchup", {}).get("right_now")

    def test_catchup_thin_session_returns_null(self, api):
        s = _create(api, "real", title="TEST_thin")
        api.post(f"{BASE_URL}/api/sessions/{s['id']}/transcript",
                 json={"seq": 0, "text": "Okay so", "at_seconds": 1}, timeout=30)
        r = api.post(f"{BASE_URL}/api/sessions/{s['id']}/catchup", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["right_now"] is None
        assert d["how_we_got_here"] is None
        assert d["terms"] == []
        assert d["as_of_seconds"] == 0

    def test_catchup_empty_session_returns_null(self, api):
        s = _create(api, "real", title="TEST_empty")
        r = api.post(f"{BASE_URL}/api/sessions/{s['id']}/catchup", timeout=60)
        assert r.status_code == 200
        assert r.json()["right_now"] is None

    def test_catchup_unknown_session_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/catchup", timeout=30)
        assert r.status_code == 404

    def test_expand_returns_bullets(self, api, live_session):
        r = api.post(f"{BASE_URL}/api/sessions/{live_session['id']}/catchup/expand", timeout=120)
        assert r.status_code == 200, r.text
        bullets = r.json()["bullets"]
        assert isinstance(bullets, list)
        assert 1 <= len(bullets) <= 5, bullets
        for b in bullets:
            assert isinstance(b, str) and len(b) > 0

    def test_expand_empty_transcript(self, api):
        s = _create(api, "real", title="TEST_expand_empty")
        r = api.post(f"{BASE_URL}/api/sessions/{s['id']}/catchup/expand", timeout=60)
        assert r.status_code == 200
        assert r.json()["bullets"] == []


# ---------- Finalize: notes + quiz ----------
class TestFinalize:
    @pytest.fixture(scope="class")
    def finalized(self, api):
        s = _create(api, "real", title="TEST_final_WACC")
        sid = s["id"]
        _post_lecture(api, sid)
        e = api.post(f"{BASE_URL}/api/sessions/{sid}/end", json={"duration_seconds": 200}, timeout=30)
        assert e.status_code == 200
        f = api.post(f"{BASE_URL}/api/sessions/{sid}/finalize", timeout=180)
        assert f.status_code == 200, f.text
        return f.json()

    def test_status_complete(self, api, finalized):
        assert finalized["status"] == "complete"
        g = api.get(f"{BASE_URL}/api/sessions/{finalized['id']}", timeout=30).json()
        assert g["status"] == "complete"
        assert "_id" not in g

    def test_notes_shape(self, api, finalized):
        n = finalized["notes"]
        assert n, "notes missing"
        assert isinstance(n.get("about"), str) and n["about"]
        kps = n.get("key_points")
        assert isinstance(kps, list) and len(kps) >= 3, kps
        for kp in kps:
            assert isinstance(kp.get("text"), str) and kp["text"]
            assert isinstance(kp.get("t"), int), kp
            assert 0 <= kp["t"] <= (len(LECTURE) - 1) * 20 + 60
        assert isinstance(n.get("terms"), list)
        for t in n["terms"]:
            assert t.get("term") and t.get("definition")
        assert isinstance(n.get("numbers"), list)
        assert isinstance(n.get("left_open"), list)
        assert isinstance(n.get("thin"), bool)

    def test_notes_grounded(self, api, finalized):
        blob = str(finalized["notes"]).lower()
        assert "wacc" in blob or "weighted average cost of capital" in blob
        # numbers from the lecture should surface
        assert any(x in blob for x in ["7.8", "seven point eight", "10", "4.5"])

    def test_quiz_shape(self, api, finalized):
        q = finalized["quiz"]
        assert isinstance(q, list)
        assert len(q) == 5, f"expected 5 questions, got {len(q)}"
        for item in q:
            assert isinstance(item.get("q"), str) and item["q"]
            opts = item.get("options")
            assert isinstance(opts, list) and len(opts) == 4, opts
            assert all(isinstance(o, str) and o for o in opts)
            ai = item.get("answer_index")
            assert isinstance(ai, int) and 0 <= ai <= 3, item
            assert isinstance(item.get("explanation"), str) and item["explanation"]
            assert isinstance(item.get("t"), int)

    def test_regenerate_notes(self, api, finalized):
        r = api.post(f"{BASE_URL}/api/sessions/{finalized['id']}/notes", timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["notes"] and d["notes"].get("about")
        # persisted
        g = api.get(f"{BASE_URL}/api/sessions/{finalized['id']}", timeout=30).json()
        assert g["notes"]["about"] == d["notes"]["about"]

    def test_regenerate_quiz(self, api, finalized):
        r = api.post(f"{BASE_URL}/api/sessions/{finalized['id']}/quiz", timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["quiz"]) == 5
        g = api.get(f"{BASE_URL}/api/sessions/{finalized['id']}", timeout=30).json()
        assert len(g["quiz"]) == 5

    def test_notes_quiz_empty_transcript_422(self, api):
        s = _create(api, "real", title="TEST_no_transcript")
        rn = api.post(f"{BASE_URL}/api/sessions/{s['id']}/notes", timeout=60)
        assert rn.status_code == 422, rn.text
        rq = api.post(f"{BASE_URL}/api/sessions/{s['id']}/quiz", timeout=60)
        assert rq.status_code == 422, rq.text

    def test_notes_quiz_unknown_404(self, api):
        assert api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/notes", timeout=30).status_code == 404
        assert api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/quiz", timeout=30).status_code == 404

    def test_thin_transcript_sets_thin_flag(self, api):
        s = _create(api, "real", title="TEST_thin_final")
        api.post(f"{BASE_URL}/api/sessions/{s['id']}/transcript",
                 json={"seq": 0, "text": "Today we briefly mentioned supply and demand.", "at_seconds": 5},
                 timeout=30)
        api.post(f"{BASE_URL}/api/sessions/{s['id']}/end", json={"duration_seconds": 10}, timeout=30)
        f = api.post(f"{BASE_URL}/api/sessions/{s['id']}/finalize", timeout=180)
        assert f.status_code == 200
        d = f.json()
        assert d["status"] == "complete"
        if d.get("notes"):
            assert d["notes"]["thin"] is True, "thin flag should be true for a 1-line transcript"


# ---------- Share ----------
class TestShare:
    def test_share_idempotent_and_public_read(self, api):
        s = _create(api, "real", title="TEST_share_WACC", subject="TEST_Finance")
        sid = s["id"]
        _post_lecture(api, sid, LECTURE[:6])
        api.post(f"{BASE_URL}/api/sessions/{sid}/end", json={"duration_seconds": 100}, timeout=30)
        api.post(f"{BASE_URL}/api/sessions/{sid}/finalize", timeout=180)

        r1 = api.post(f"{BASE_URL}/api/sessions/{sid}/share", timeout=30)
        assert r1.status_code == 200, r1.text
        slug = r1.json()["slug"]
        assert isinstance(slug, str) and len(slug) >= 6

        r2 = api.post(f"{BASE_URL}/api/sessions/{sid}/share", timeout=30)
        assert r2.json()["slug"] == slug, "share slug must be idempotent"

        pub = api.get(f"{BASE_URL}/api/shared/{slug}", timeout=30)
        assert pub.status_code == 200, pub.text
        d = pub.json()
        assert d["title"] == "TEST_share_WACC"
        assert d["subject"] == "TEST_Finance"
        assert d["notes"] is not None
        assert d["quiz"] is not None and len(d["quiz"]) == 5
        assert "_id" not in d
        # public payload must not leak internal fields
        assert "device_id" not in d and "running_summary" not in d

    def test_shared_unknown_slug_404(self, api):
        r = api.get(f"{BASE_URL}/api/shared/definitely-not-a-slug-xyz", timeout=30)
        assert r.status_code == 404

    def test_share_unknown_session_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/share", timeout=30)
        assert r.status_code == 404


# ---------- Device scoping ----------
class TestDeviceScoping:
    def test_scoped_list(self, api):
        dev_a = f"TEST_dev_{uuid.uuid4().hex[:8]}"
        dev_b = f"TEST_dev_{uuid.uuid4().hex[:8]}"
        s = _create(api, "real", title="TEST_device_A", device=dev_a)

        la = api.get(f"{BASE_URL}/api/sessions", headers={"X-Device-Id": dev_a}, timeout=30)
        assert la.status_code == 200
        ids = [x["id"] for x in la.json()]
        assert s["id"] in ids
        assert all(x.get("device_id") == dev_a for x in la.json())

        lb = api.get(f"{BASE_URL}/api/sessions", headers={"X-Device-Id": dev_b}, timeout=30)
        assert lb.status_code == 200
        assert s["id"] not in [x["id"] for x in lb.json()]

        ln = api.get(f"{BASE_URL}/api/sessions", timeout=30)
        assert ln.status_code == 200
        assert ln.json() == []

    def test_list_newest_first(self, api):
        dev = f"TEST_dev_{uuid.uuid4().hex[:8]}"
        first = _create(api, "real", title="TEST_first", device=dev)
        second = _create(api, "demo", title="TEST_second", device=dev)
        lst = api.get(f"{BASE_URL}/api/sessions", headers={"X-Device-Id": dev}, timeout=30).json()
        assert [x["id"] for x in lst][:2] == [second["id"], first["id"]]

    def test_replay_mode_accepted(self, api):
        dev = f"TEST_dev_{uuid.uuid4().hex[:8]}"
        src = _create(api, "real", title="TEST_src", device=dev)
        r = api.post(f"{BASE_URL}/api/sessions",
                     json={"title": "TEST_replay", "mode": "replay", "source_session_id": src["id"]},
                     headers={"X-Device-Id": dev}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["mode"] == "replay"
