"""ClassOS Phase 1 backend API tests: health, current class, session lifecycle."""
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

CLASS_ID = "cls_consumer_behaviour"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
class TestHealth:
    def test_health(self, api):
        r = api.get(f"{BASE_URL}/api/health", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "ok"
        assert d["database"] == "connected"
        assert d["service"] == "ClassOS API"
        assert isinstance(d["timestamp"], str)


# ---------- Current class ----------
class TestCurrentClass:
    def test_current_class(self, api):
        r = api.get(f"{BASE_URL}/api/classes/current", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["id"] == CLASS_ID
        assert d["course_title"] == "Consumer Behaviour"
        assert d["topic"] == "Price elasticity of demand"
        assert d["professor"] == "Prof. Mehta"
        assert d["room"] == "Room 916"
        assert d["code"] == "CB"
        assert d["status"] == "starting_now"
        assert "_id" not in d


# ---------- Session lifecycle ----------
class TestSessionLifecycle:
    @pytest.mark.parametrize("mode", ["real", "demo"])
    def test_full_lifecycle(self, api, mode):
        # CREATE
        r = api.post(f"{BASE_URL}/api/sessions", json={"class_id": CLASS_ID, "mode": mode}, timeout=30)
        assert r.status_code == 200, r.text
        s = r.json()
        sid = s["id"]
        assert isinstance(sid, str)
        assert s["status"] == "live"
        assert s["mode"] == mode
        assert s["class_id"] == CLASS_ID
        assert s["course_title"] == "Consumer Behaviour"
        assert s["ended_at"] is None
        assert s["started_at"]
        assert "_id" not in s

        # GET verifies persistence
        g = api.get(f"{BASE_URL}/api/sessions/{sid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["status"] == "live"
        assert g.json()["mode"] == mode

        # END
        e = api.post(f"{BASE_URL}/api/sessions/{sid}/end", json={"duration_seconds": 42}, timeout=30)
        assert e.status_code == 200, e.text
        ed = e.json()
        assert ed["status"] == "processing"
        assert ed["duration_seconds"] == 42
        assert ed["ended_at"]

        g = api.get(f"{BASE_URL}/api/sessions/{sid}", timeout=30).json()
        assert g["status"] == "processing"
        assert g["duration_seconds"] == 42
        assert g["ended_at"] == ed["ended_at"]

        # FINALIZE
        f = api.post(f"{BASE_URL}/api/sessions/{sid}/finalize", timeout=30)
        assert f.status_code == 200, f.text
        assert f.json()["status"] == "complete"

        g = api.get(f"{BASE_URL}/api/sessions/{sid}", timeout=30).json()
        assert g["status"] == "complete"
        assert g["duration_seconds"] == 42

    def test_end_defaults_duration_when_body_empty(self, api):
        r = api.post(f"{BASE_URL}/api/sessions", json={"class_id": CLASS_ID, "mode": "demo"}, timeout=30)
        sid = r.json()["id"]
        e = api.post(f"{BASE_URL}/api/sessions/{sid}/end", json={}, timeout=30)
        assert e.status_code == 200, e.text
        assert e.json()["duration_seconds"] == 0


# ---------- Error handling ----------
class TestErrors:
    def test_get_unknown_session_404(self, api):
        r = api.get(f"{BASE_URL}/api/sessions/{uuid.uuid4()}", timeout=30)
        assert r.status_code == 404
        assert r.json()["detail"] == "Session not found"

    def test_create_invalid_class_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions", json={"class_id": "nope", "mode": "real"}, timeout=30)
        assert r.status_code == 404
        assert r.json()["detail"] == "Class not found"

    def test_end_unknown_session_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/end", json={"duration_seconds": 1}, timeout=30)
        assert r.status_code == 404

    def test_finalize_unknown_session_404(self, api):
        r = api.post(f"{BASE_URL}/api/sessions/{uuid.uuid4()}/finalize", timeout=30)
        assert r.status_code == 404

    def test_invalid_mode_422(self, api):
        r = api.post(f"{BASE_URL}/api/sessions", json={"class_id": CLASS_ID, "mode": "bogus"}, timeout=30)
        assert r.status_code == 422

    def test_missing_class_id_422(self, api):
        r = api.post(f"{BASE_URL}/api/sessions", json={"mode": "real"}, timeout=30)
        assert r.status_code == 422
