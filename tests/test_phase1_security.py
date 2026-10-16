"""
Phase 1 Security Hardening Automated Test Suite
Verifies:
1. P0-SEC-01: Telegram Bot Token Protection in Streaming
2. P0-SEC-02: Hardcoded Administrative Credential & Static Token Elimination
3. P0-SEC-03: Diagnostic Endpoint Authorization & Rate Limiting
4. P0-SEC-04: CORS Policy Enforcement for Trusted vs Untrusted Origins
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import create_access_token, hash_password
from app.db.database import get_db, SessionLocal
from app.db.models import User

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_test_users():
    """Seeds test admin and test student users in the database for role tests."""
    with SessionLocal() as db:
        # 1. Admin User
        admin = db.query(User).filter(User.username == "sec_test_admin").first()
        if not admin:
            admin = User(
                username="sec_test_admin",
                password_hash=hash_password("SuperSecretAdminPass#2026!"),
                role="admin"
            )
            db.add(admin)

        # 2. Student User (non-admin)
        student = db.query(User).filter(User.username == "sec_test_student").first()
        if not student:
            student = User(
                username="sec_test_student",
                password_hash=hash_password("StudentPass#2026!"),
                role="student"
            )
            db.add(student)

        db.commit()

    yield

    # Teardown
    with SessionLocal() as db:
        db.query(User).filter(User.username.in_(["sec_test_admin", "sec_test_student"])).delete(synchronize_session=False)
        db.commit()


# ==============================================================================
# 1. P0-SEC-02: Authentication & Authorization Tests
# ==============================================================================

def test_login_with_invalid_password():
    """Verify arbitrary passwords are rejected with 401."""
    resp = client.post("/api/auth/login", json={"username": "sec_test_admin", "password": "WrongPassword123"})
    assert resp.status_code == 401
    assert "اسم المستخدم أو كلمة المرور غير صحيحة" in resp.json()["detail"]


def test_login_rejects_historical_backdoors(setup_test_users):
    """Verify historical backdoors (admin123 / admin_academic_2026) are rejected if they don't match the hash."""
    resp1 = client.post("/api/auth/login", json={"username": "sec_test_admin", "password": "admin123"})
    assert resp1.status_code == 401

    resp2 = client.post("/api/auth/login", json={"username": "sec_test_admin", "password": "admin_academic_2026"})
    assert resp2.status_code == 401


def test_login_with_valid_password(setup_test_users):
    """Verify legitimate login succeeds and returns a valid signed JWT."""
    resp = client.post("/api/auth/login", json={"username": "sec_test_admin", "password": "SuperSecretAdminPass#2026!"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "access_token" in data
    assert data["username"] == "sec_test_admin"
    assert data["role"] == "admin"


def test_rejected_static_tokens():
    """Verify that previously accepted static bypass tokens are rejected with 401."""
    static_tokens = [
        "academic_admin_valid_session_2026",
        "admin_static_token_2026",
        "admin_academic_cloud_token_1234567890",
        "arbitrary_unsigned_token"
    ]
    for token in static_tokens:
        resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401, f"Token '{token}' should have been rejected"


def test_legitimate_jwt_verification(setup_test_users):
    """Verify /api/auth/me accepts legitimately signed JWT."""
    token = create_access_token({"sub": "sec_test_admin", "role": "admin"})
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "sec_test_admin"


def test_non_admin_cannot_access_admin_endpoints(setup_test_users):
    """Verify an authenticated student/non-admin receives 403 on admin-only endpoints."""
    student_token = create_access_token({"sub": "sec_test_student", "role": "student"})
    
    # 1. Diagnostics logs
    resp = client.get("/api/diagnostics/logs", headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 403
    assert "المشرفين" in resp.json()["detail"]

    # 2. Clear logs
    resp2 = client.post("/api/diagnostics/clear-logs", headers={"Authorization": f"Bearer {student_token}"})
    assert resp2.status_code == 403


# ==============================================================================
# 2. P0-SEC-03: Diagnostics & Rate Limiting Tests
# ==============================================================================

def test_unauthenticated_cannot_access_logs():
    """Verify unauthenticated users cannot read or clear server logs."""
    r1 = client.get("/api/diagnostics/logs")
    assert r1.status_code == 401

    r2 = client.post("/api/diagnostics/clear-logs")
    assert r2.status_code == 401


def test_admin_can_access_and_clear_logs(setup_test_users):
    """Verify admin user can read logs and clear logs."""
    admin_token = create_access_token({"sub": "sec_test_admin", "role": "admin"})

    r1 = client.get("/api/diagnostics/logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert r1.status_code == 200
    assert "logs" in r1.json()

    r2 = client.post("/api/diagnostics/clear-logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "cleared"


def test_diagnostics_overview_masks_telegram_channel():
    """Verify /api/diagnostics does not expose raw telegram channel ID."""
    resp = client.get("/api/diagnostics")
    assert resp.status_code == 200
    data = resp.json()
    assert "telegram_mtproto" in data
    # channel_id must not be exposed in plaintext
    assert "channel_id" not in data["telegram_mtproto"]
    assert "configured" in data["telegram_mtproto"]


def test_client_log_payload_validation():
    """Verify client log payload validates length and rejects oversized inputs."""
    # 1. Message exceeding 1000 characters -> 422 Unprocessable Entity
    oversized_msg = "A" * 1001
    resp = client.post("/api/diagnostics/client-log", json={"level": "ERROR", "message": oversized_msg})
    assert resp.status_code == 422

    # 2. Context exceeding 2000 characters -> 422
    huge_context = {"data": "X" * 2050}
    resp2 = client.post("/api/diagnostics/client-log", json={"level": "ERROR", "message": "Test error", "context": huge_context})
    assert resp2.status_code == 422

    # 3. Valid message -> 200 OK
    resp3 = client.post("/api/diagnostics/client-log", json={"level": "ERROR", "message": "Audio load timeout"})
    assert resp3.status_code == 200
    assert resp3.json()["status"] == "recorded"


def test_client_log_rate_limiting():
    """Verify rapid bursts of requests from same IP trigger 429 Too Many Requests."""
    responses = []
    # Rate limit is 15 requests per minute
    for i in range(20):
        r = client.post("/api/diagnostics/client-log", json={"level": "WARNING", "message": f"Burst log {i}"})
        responses.append(r.status_code)
    
    # At least some requests towards the end of the burst must receive 429
    assert 429 in responses, "Burst should have triggered 429 Too Many Requests"


# ==============================================================================
# 3. P0-SEC-01: Telegram Bot Token Protection in Streaming
# ==============================================================================

def test_stream_nonexistent_asset_does_not_leak_tokens():
    """Verify streaming a non-existent asset returns 404 without leaking any token or credentials."""
    resp = client.get("/api/stream/99999999")
    assert resp.status_code == 404
    assert resp.headers.get("Location") is None
    # Ensure neither token pattern nor internal bot url appears in response body
    body_text = resp.text
    assert "bot" not in body_text.lower() or "bot token" not in body_text.lower()
    assert "https://api.telegram.org" not in body_text


# ==============================================================================
# 4. P0-SEC-04: CORS Enforcement Tests
# ==============================================================================

def test_cors_trusted_origin_accepted():
    """Verify trusted Cloudflare Pages origin receives appropriate CORS headers."""
    headers = {
        "Origin": "https://bsu-math-ai-portal.pages.dev",
        "Access-Control-Request-Method": "GET"
    }
    resp = client.options("/api/subjects", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "https://bsu-math-ai-portal.pages.dev"
    assert resp.headers.get("access-control-allow-credentials") == "true"


def test_cors_untrusted_origin_rejected():
    """Verify an untrusted origin does not receive credentialed CORS authorization."""
    headers = {
        "Origin": "https://malicious-attacker-site.com",
        "Access-Control-Request-Method": "GET"
    }
    resp = client.options("/api/subjects", headers=headers)
    # The untrusted origin must NOT be reflected in access-control-allow-origin
    allow_origin = resp.headers.get("access-control-allow-origin")
    assert allow_origin != "https://malicious-attacker-site.com"
