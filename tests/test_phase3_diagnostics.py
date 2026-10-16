"""
Phase 3 Step 3: Diagnostic Query Optimization Regression Test Suite
Verifies:
1. Endpoint /api/diagnostics returns complete, semantically identical data structure.
2. Database query count is strictly bounded (O(1) queries via eager loading)
   eliminating the N+1 loop pattern.
"""
import pytest
from sqlalchemy import event
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import engine

client = TestClient(app)

def test_diagnostics_endpoint_contract():
    """Verify the diagnostics endpoint maintains its full contract and semantics."""
    resp = client.get("/api/diagnostics")
    assert resp.status_code == 200
    data = resp.json()

    # Top-level keys
    assert data["status"] == "online"
    assert data["service"] == "bsu-math-api"
    assert "timestamp" in data
    assert "database" in data
    assert "status" in data["database"]
    assert "latency_ms" in data["database"]
    assert "telegram_mtproto" in data
    assert "summary" in data
    assert "lectures" in data

    # Summary structure
    summary = data["summary"]
    for expected_key in [
        "total_lectures", "complete_5_of_5", "partial_modality",
        "missing_assets_count", "total_audios", "total_videos",
        "total_quizzes_ready", "total_guides_ready", "total_flashcards_ready"
    ]:
        assert expected_key in summary, f"Missing key '{expected_key}' in summary"

    # Lecture audits structure
    lectures = data["lectures"]
    assert isinstance(lectures, list)
    if len(lectures) > 0:
        lec = lectures[0]
        assert "lecture_id" in lec
        assert "subject" in lec
        assert "lecture_num" in lec
        assert "title" in lec
        assert "score" in lec
        assert "modalities" in lec
        for mod in ["quiz", "guide", "flashcards", "audio", "video"]:
            assert mod in lec["modalities"], f"Missing modality '{mod}' in lecture audit"


def test_diagnostics_bounded_query_count():
    """
    Verify /api/diagnostics executes a bounded, constant number of queries (<= 3),
    proving that per-lecture N+1 queries have been eliminated.
    """
    executed_queries = []

    def query_listener(conn, cursor, statement, parameters, context, executemany):
        executed_queries.append(statement)

    event.listen(engine, "before_cursor_execute", query_listener)
    try:
        resp = client.get("/api/diagnostics")
        assert resp.status_code == 200
        data = resp.json()
        lecture_count = len(data["lectures"])

        # With 21 lectures, N+1 was 31 queries.
        # With joinedload + selectinload, it should be at most 2 database queries.
        # We assert <= 3 to allow any small driver/session check while preventing N+1.
        assert len(executed_queries) <= 3, (
            f"Expected bounded queries (<=3) for {lecture_count} lectures, but got {len(executed_queries)} queries! "
            f"Queries: {executed_queries}"
        )
    finally:
        event.remove(engine, "before_cursor_execute", query_listener)
