"""Tests for scheduled daily study push notifications."""

from __future__ import annotations

from datetime import date, datetime, timezone
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import SessionLocal
from app.db.models import PushSubscription, User
from app.main import app
from app.services.auth_service import create_access_token, hash_password
from app.services.notification_service import (
    _load_profile_and_due_maps,
    compose_study_reminder_payload,
    get_cairo_today,
    send_scheduled_study_reminders,
)

client = TestClient(app)


def test_compose_study_reminder_skips_if_studied_today_and_no_due_cards():
    today = date(2026, 11, 15)
    payload = compose_study_reminder_payload(
        student_name="سارة",
        persona="girls",
        current_streak=5,
        due_mistakes_count=0,
        cairo_today=today,
        studied_today=True,
    )
    assert payload is None


def test_compose_study_reminder_prioritizes_due_mistakes_even_if_studied_today():
    today = date(2026, 11, 15)
    payload = compose_study_reminder_payload(
        student_name=None,
        persona="girls",
        current_streak=4,
        due_mistakes_count=3,
        cairo_today=today,
        studied_today=True,
    )
    assert payload is not None
    assert payload["data"]["reason"] == "due_mistakes"
    assert payload["data"]["tag"] == "study-reminder-2026-11-15"
    assert "3" in payload["title"]
    assert "يا دكتورة" in payload["body"]


def test_compose_study_reminder_protects_streak_when_not_studied_today():
    today = date(2026, 11, 15)
    payload = compose_study_reminder_payload(
        student_name="أحمد",
        persona="boys",
        current_streak=6,
        due_mistakes_count=0,
        cairo_today=today,
        studied_today=False,
    )
    assert payload is not None
    assert payload["data"]["reason"] == "streak_guard"
    assert "6" in payload["title"]
    assert "أحمد" in payload["title"]


def test_compose_study_reminder_falls_back_to_daily_nudge():
    today = date(2026, 11, 15)
    payload = compose_study_reminder_payload(
        student_name=None,
        persona="boys",
        current_streak=0,
        due_mistakes_count=0,
        cairo_today=today,
        studied_today=False,
    )
    assert payload is not None
    assert payload["data"]["reason"] == "daily_nudge"
    assert "يا بطل" in payload["title"]


def test_get_cairo_today_respects_cairo_offset():
    # 22:30 UTC is already next day in Africa/Cairo (UTC+2)
    utc_dt = datetime(2026, 11, 15, 22, 30, tzinfo=timezone.utc)
    assert get_cairo_today(utc_dt) == date(2026, 11, 16)


def test_send_scheduled_study_reminders_dry_run_and_dispatch():
    engine = create_engine("sqlite:///:memory:")
    PushSubscription.__table__.create(engine)
    TestSession = sessionmaker(bind=engine)
    db = TestSession()
    ep1 = "https://push.example.test/sub-reminder-1"
    ep2 = "https://push.example.test/sub-reminder-2"
    uid1 = str(uuid4())
    uid2 = str(uuid4())
    try:
        db.add_all([
            PushSubscription(endpoint=ep1, p256dh="k1", auth="a1", user_id=uid1, student_name="كريم"),
            PushSubscription(endpoint=ep2, p256dh="k2", auth="a2", user_id=uid2, student_name="منى"),
        ])
        db.commit()

        today = date(2026, 11, 15)
        fake_profiles = {
            uid1: {"nickname": "كريم", "persona": "boys", "current_streak": 4, "last_active_date": today},
            uid2: {"nickname": "منى", "persona": "girls", "current_streak": 2, "last_active_date": date(2026, 11, 14)},
        }
        fake_due = {uid1: 0, uid2: 5}

        with patch("app.services.notification_service._load_profile_and_due_maps", return_value=(fake_profiles, fake_due)):
            with patch("app.services.notification_service.dispatch_web_push_payload", return_value=True) as mock_push:
                dry = send_scheduled_study_reminders(
                    db,
                    dry_run=True,
                    now_utc=datetime(2026, 11, 15, 16, 0, tzinfo=timezone.utc),
                )
                assert dry["dry_run"] is True
                assert dry["total_subscriptions"] == 2
                assert dry["skipped_already_studied"] == 1
                assert dry["eligible"] == 1
                assert dry["delivered"] == 0
                assert dry["reasons"]["due_mistakes"] == 1
                assert mock_push.call_count == 0

                live = send_scheduled_study_reminders(
                    db,
                    dry_run=False,
                    now_utc=datetime(2026, 11, 15, 16, 0, tzinfo=timezone.utc),
                )
                assert live["dry_run"] is False
                assert live["delivered"] == 1
                assert mock_push.call_count == 1
    finally:
        db.close()
        engine.dispose()


def test_load_profile_and_due_maps_handles_uuid_strings_on_session():
    db = SessionLocal()
    try:
        profiles, due = _load_profile_and_due_maps(db, [str(uuid4())], date(2026, 11, 15))
        assert isinstance(profiles, dict)
        assert isinstance(due, dict)
    finally:
        db.close()


def test_send_study_reminders_endpoint_auth_and_execution():
    db = SessionLocal()
    try:
        for uname, role in [("reminder_student", "student"), ("reminder_admin", "admin")]:
            if not db.query(User).filter(User.username == uname).first():
                db.add(User(username=uname, password_hash=hash_password("pw"), role=role))
        db.commit()
    finally:
        db.close()

    assert client.post("/api/notifications/send-study-reminders").status_code == 401

    stu_tok = create_access_token({"sub": "reminder_student", "role": "student"})
    res_stu = client.post(
        "/api/notifications/send-study-reminders?dry_run=true",
        headers={"Authorization": f"Bearer {stu_tok}"},
    )
    assert res_stu.status_code == 403

    adm_tok = create_access_token({"sub": "reminder_admin", "role": "admin"})
    res_adm = client.post(
        "/api/notifications/send-study-reminders?dry_run=true",
        headers={"Authorization": f"Bearer {adm_tok}"},
    )
    assert res_adm.status_code == 200
    body = res_adm.json()
    assert body["status"] == "ok"
    assert body["dry_run"] is True
    assert "total_subscriptions" in body
