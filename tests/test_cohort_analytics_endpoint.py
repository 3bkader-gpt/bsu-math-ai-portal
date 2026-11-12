"""
Tests for Stage 1 Feature 1.3: Admin Cohort & KPI Analytics Endpoint (`GET /api/diagnostics/cohort-analytics`).
Verifies strict JWT admin role enforcement (401/403) and structured KPI payload response (200).
"""

from fastapi.testclient import TestClient
from app.main import app
from app.db.models import User
from app.services.auth_service import get_current_user

client = TestClient(app)


def test_cohort_analytics_requires_authentication():
    res = client.get("/api/diagnostics/cohort-analytics")
    assert res.status_code in (401, 403)


def test_cohort_analytics_rejects_non_admin_user():
    def _mock_student():
        return User(id=99, username="student_user", role="student")

    app.dependency_overrides[get_current_user] = _mock_student
    try:
        res = client.get("/api/diagnostics/cohort-analytics")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_cohort_analytics_returns_kpi_payload_for_admin():
    def _mock_admin():
        return User(id=1, username="admin", role="admin")

    app.dependency_overrides[get_current_user] = _mock_admin
    try:
        res = client.get("/api/diagnostics/cohort-analytics")
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "success"
        assert "totalProfilesCount" in body
        assert "dauList" in body
        assert "retentionList" in body
        assert "mistakeReviewStats" in body
        assert "timeToFirstActionList" in body
        assert "hardestQuestionsList" in body
        assert isinstance(body["dauList"], list)
        assert isinstance(body["retentionList"], list)
        assert isinstance(body["timeToFirstActionList"], list)
        assert isinstance(body["hardestQuestionsList"], list)
        assert "review_completion_pct" in body["mistakeReviewStats"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)
