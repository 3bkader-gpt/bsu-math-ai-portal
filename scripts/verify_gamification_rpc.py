import sys
import os
import uuid
import httpx
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")

def print_section(title: str):
    print("\n" + "=" * 65)
    print(f"🔬 {title}")
    print("=" * 65)

def create_test_student():
    client = httpx.Client(timeout=20)
    test_device_id = str(uuid.uuid4())
    student_email = f"student.{test_device_id[:8]}@bsu-math.internal"
    student_pass = f"Pass_{test_device_id[:12]}"
    
    r_admin = client.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
        },
        json={
            "email": student_email,
            "password": student_pass,
            "email_confirm": True,
            "user_metadata": {"nickname": f"طالب_{test_device_id[:4]}", "persona": "boys"}
        }
    )
    assert r_admin.status_code in (200, 201), f"Admin user creation failed: {r_admin.text}"
    user_id = r_admin.json().get("id")
    
    r_login = client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": student_email, "password": student_pass}
    )
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    access_token = r_login.json().get("access_token")
    return user_id, student_email, access_token

def verify_database_schema():
    print_section("Test 1: Supabase Database Schema & Routines")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    expected_tables = [
        "profiles", 
        "activity_events", 
        "daily_activity", 
        "user_achievements", 
        "lecture_progress",
        "mistake_notebook",
        "ingestion_errors"
    ]
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ANY(%s);
    """, (expected_tables,))
    found_tables = [r[0] for r in cur.fetchall()]
    
    for t in expected_tables:
        if t in found_tables:
            print(f"  ✅ Table public.{t} exists")
        else:
            raise AssertionError(f"Missing table public.{t}")
            
    # Check functions
    cur.execute("""
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name IN ('ingest_events', 'get_cohort_leaderboard', 'submit_mistake_review');
    """)
    routines = [r[0] for r in cur.fetchall()]
    assert "ingest_events" in routines, "Missing routine ingest_events"
    assert "get_cohort_leaderboard" in routines, "Missing routine get_cohort_leaderboard"
    assert "submit_mistake_review" in routines, "Missing routine submit_mistake_review"
    print("  ✅ Stored procedure public.ingest_events() exists")
    print("  ✅ Stored procedure public.get_cohort_leaderboard() exists")
    print("  ✅ Stored procedure public.submit_mistake_review() exists")
    conn.close()

def verify_baseline_and_idempotency():
    print_section("Test 2: Baseline Events & Strict Idempotency")
    user_id, email, access_token = create_test_student()
    client = httpx.Client(timeout=20)
    user_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    event1_id = str(uuid.uuid4())
    event2_id = str(uuid.uuid4())
    events_payload = [
        {
            "id": event1_id,
            "type": "media.completed",
            "lectureId": 28,
            "payload": {"kind": "audio", "durationSec": 1200},
            "clientTs": "2026-10-20T10:00:00Z"
        },
        {
            "id": event2_id,
            "type": "quiz.finished",
            "lectureId": 28,
            "payload": {"score": 10, "total": 10, "attempt": 1, "durationMs": 45000},
            "clientTs": "2026-10-20T10:10:00Z"
        }
    ]

    r_rpc = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": events_payload}
    )
    assert r_rpc.status_code == 200, f"RPC call failed: {r_rpc.text}"
    res = r_rpc.json()
    awarded_xp = res.get("awardedXp", 0)
    print(f"  ✅ Ingested 2 events successfully. Awarded XP: {awarded_xp} (Expected: 100 [25 audio + 75 perfect quiz])")
    assert awarded_xp == 100, f"Expected 100 XP, got {awarded_xp}"

    # Replay test
    r_replay = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": events_payload}
    )
    assert r_replay.status_code == 200
    replay_xp = r_replay.json().get("awardedXp", 0)
    print(f"  ✅ Replay awarded XP: {replay_xp} (Strictly 0 expected)")
    assert replay_xp == 0, f"Expected 0 XP on replay, got {replay_xp}"

def verify_mistake_notebook_auto_ingestion():
    print_section("Test 3: Wrong Answer Auto-Ingestion to Mistake Notebook")
    user_id, email, access_token = create_test_student()
    client = httpx.Client(timeout=20)
    user_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    q_hash = f"q_hash_{uuid.uuid4().hex[:12]}"
    wrong_event = {
        "id": str(uuid.uuid4()),
        "type": "quiz.question_answered",
        "lectureId": 28,
        "payload": {
            "questionHash": q_hash,
            "questionText": "ما هي وحدة قياس المقاومة الكهربائية؟",
            "userAnswer": "الفولت",
            "correctAnswer": "الأوم",
            "explanation": "الأوم هي وحدة المقاومة الكهربائية المشتقة من قانون أوم V = IR.",
            "isCorrect": False,
            "durationMs": 4200,
            "confidence": "high",
            "hintLevelUsed": 0
        },
        "clientTs": "2026-10-20T10:15:00Z"
    }

    r_rpc = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": [wrong_event]}
    )
    assert r_rpc.status_code == 200, f"RPC call failed: {r_rpc.text}"
    res = r_rpc.json()
    assert res.get("awardedXp") == 0, "Wrong answer must award 0 XP"

    # Verify mistake_notebook row via Direct DB connection
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT question_hash, question_text, correct_answer, user_last_mistake, box_level, next_review_date, is_mastered
        FROM public.mistake_notebook
        WHERE user_id = %s AND question_hash = %s;
    """, (user_id, q_hash))
    row = cur.fetchone()
    assert row is not None, "Mistake was NOT ingested into mistake_notebook!"
    print(f"  ✅ Mistake ingested: '{row[1]}' -> Mistake: '{row[3]}', Correct: '{row[2]}'")
    print(f"  ✅ Initial Box Level: {row[4]} (Box 1 expected)")
    print(f"  ✅ Due Date: {row[5]}")
    assert row[4] == 1, "Initial box level must be 1"
    assert row[3] == "الفولت"
    assert row[2] == "الأوم"
    conn.close()

def verify_quiz_daily_replay_guard():
    print_section("Test 4: Quiz Question Daily Replay Guard")
    user_id, email, access_token = create_test_student()
    client = httpx.Client(timeout=20)
    user_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    q_hash = f"q_correct_{uuid.uuid4().hex[:12]}"
    
    # First correct answer -> 5 base + 3 confidence = 8 XP
    first_ans = {
        "id": str(uuid.uuid4()),
        "type": "quiz.question_answered",
        "lectureId": 28,
        "payload": {
            "questionHash": q_hash,
            "questionText": "قانون أوم يربط بين:",
            "userAnswer": "الجهد والتيار والمقاومة",
            "correctAnswer": "الجهد والتيار والمقاومة",
            "isCorrect": True,
            "durationMs": 5000,
            "confidence": "high"
        },
        "clientTs": "2026-10-20T10:20:00Z"
    }

    r1 = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": [first_ans]}
    )
    assert r1.status_code == 200
    xp1 = r1.json().get("awardedXp", 0)
    print(f"  ✅ First correct answer: Awarded {xp1} XP (Expected: 8 XP)")
    assert xp1 == 8, f"Expected 8 XP, got {xp1}"

    # Repeated answer on the same day -> must award 0 XP
    second_ans = {
        "id": str(uuid.uuid4()),
        "type": "quiz.question_answered",
        "lectureId": 28,
        "payload": {
            "questionHash": q_hash,
            "questionText": "قانون أوم يربط بين:",
            "userAnswer": "الجهد والتيار والمقاومة",
            "correctAnswer": "الجهد والتيار والمقاومة",
            "isCorrect": True,
            "durationMs": 4000,
            "confidence": "high"
        },
        "clientTs": "2026-10-20T10:25:00Z"
    }

    r2 = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": [second_ans]}
    )
    assert r2.status_code == 200
    xp2 = r2.json().get("awardedXp", 0)
    print(f"  ✅ Same-day repeated question: Awarded {xp2} XP (Strictly 0 expected)")
    assert xp2 == 0, f"Expected 0 XP on repeated answer, got {xp2}"

def verify_mistake_review_procedure():
    print_section("Test 5: Mistake Review RPC & Anti-Cheat Guards")
    user_id, email, access_token = create_test_student()
    client = httpx.Client(timeout=20)
    user_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    q_hash = f"q_review_{uuid.uuid4().hex[:12]}"
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Insert a mistake manually due tomorrow (Box 1)
    cur.execute("""
        INSERT INTO public.mistake_notebook (
            user_id, lecture_id, question_hash, question_text, correct_answer, user_last_mistake, box_level, next_review_date
        ) VALUES (
            %s, 28, %s, 'سؤال اختبار المراجعة', 'إجابة صحيحة', 'إجابة خاطئة', 1, (now() AT TIME ZONE 'Africa/Cairo')::DATE + 1
        );
    """, (user_id, q_hash))
    conn.commit()

    # 1. Attempt review before due date -> MUST FAIL WITH EXCEPTION
    r_early = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/submit_mistake_review",
        headers=user_headers,
        json={"p_question_hash": q_hash, "p_is_correct": True, "p_duration_ms": 5000}
    )
    print(f"  ✅ Early review attempt status: {r_early.status_code} (Rejection expected)")
    assert r_early.status_code == 400, "Early review before due date must be rejected"

    # 2. Update due date to today
    cur.execute("""
        UPDATE public.mistake_notebook 
        SET next_review_date = (now() AT TIME ZONE 'Africa/Cairo')::DATE
        WHERE user_id = %s AND question_hash = %s;
    """, (user_id, q_hash))
    conn.commit()

    # 3. Deliberate review (duration >= 3000ms, correct) -> Promotes to Box 2, awards 15 XP
    r_review = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/submit_mistake_review",
        headers=user_headers,
        json={"p_question_hash": q_hash, "p_is_correct": True, "p_duration_ms": 4500}
    )
    assert r_review.status_code == 200, f"Valid review failed: {r_review.text}"
    rev_data = r_review.json()
    print(f"  ✅ Valid review response: Box Level {rev_data.get('boxLevel')}, Awarded XP: {rev_data.get('awardedXp')}")
    assert rev_data.get("boxLevel") == 2, "Box level must advance to 2"
    assert rev_data.get("awardedXp") == 15, "Deliberate review must award 15 XP"

    # 4. Fast review test: set another question due today, answer in 1000ms
    q_fast_hash = f"q_fast_{uuid.uuid4().hex[:12]}"
    cur.execute("""
        INSERT INTO public.mistake_notebook (
            user_id, lecture_id, question_hash, question_text, correct_answer, user_last_mistake, box_level, next_review_date
        ) VALUES (
            %s, 28, %s, 'سؤال سريع', 'صح', 'غلط', 1, (now() AT TIME ZONE 'Africa/Cairo')::DATE
        );
    """, (user_id, q_fast_hash))
    conn.commit()

    r_fast = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/submit_mistake_review",
        headers=user_headers,
        json={"p_question_hash": q_fast_hash, "p_is_correct": True, "p_duration_ms": 1200}
    )
    assert r_fast.status_code == 200
    fast_data = r_fast.json()
    print(f"  ✅ Fast review (<3s): Box Level {fast_data.get('boxLevel')} (Promoted), Awarded XP: {fast_data.get('awardedXp')} (0 XP expected)")
    assert fast_data.get("boxLevel") == 2, "Fast correct answer still advances box"
    assert fast_data.get("awardedXp") == 0, "Fast answer must award strictly 0 XP"

    conn.close()

def verify_daily_cap_and_poisoned_batch():
    print_section("Test 6: 400 XP Daily Cap & Poisoned Payload Resilience")
    user_id, email, access_token = create_test_student()
    client = httpx.Client(timeout=20)
    user_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Set daily activity to 395 XP directly via DB
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO public.daily_activity (user_id, day, xp_earned, items_completed, seconds_active, updated_at)
        VALUES (%s, (now() AT TIME ZONE 'Africa/Cairo')::DATE, 395, 10, 600, now())
        ON CONFLICT (user_id, day) DO UPDATE SET xp_earned = 395;
    """, (user_id,))
    conn.commit()
    conn.close()

    # Ingest event worth 25 XP -> Should be capped at 5 XP (395 + 5 = 400)
    event1 = {
        "id": str(uuid.uuid4()),
        "type": "media.completed",
        "lectureId": 28,
        "payload": {"kind": "audio", "durationSec": 1200},
        "clientTs": "2026-10-20T10:30:00Z"
    }

    r_cap = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": [event1]}
    )
    assert r_cap.status_code == 200
    awarded_cap = r_cap.json().get("awardedXp")
    print(f"  ✅ Event near cap: Awarded {awarded_cap} XP (Expected: exactly 5 XP to reach 400 limit)")
    assert awarded_cap == 5, f"Expected 5 XP, got {awarded_cap}"

    # Ingest subsequent event -> Must be capped at strictly 0 XP
    event2 = {
        "id": str(uuid.uuid4()),
        "type": "study_guide.read",
        "lectureId": 28,
        "payload": {"dwellSec": 120},
        "clientTs": "2026-10-20T10:31:00Z"
    }
    r_over = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": [event2]}
    )
    assert r_over.status_code == 200
    assert r_over.json().get("awardedXp") == 0, "Over-cap event must award 0 XP"
    print("  ✅ 400 XP hard cap strictly enforced: Subsequent events awarded 0 XP")

    # Poisoned Payload Resilience Test
    # Send a batch with 1 malformed question event (missing required fields) + 1 valid media event
    poisoned_event = {
        "id": str(uuid.uuid4()),
        "type": "quiz.question_answered",
        "lectureId": 999999, # invalid foreign key to force sub-transaction exception
        "payload": {
            "questionHash": "poisoned_hash",
            "isCorrect": False,
            "durationMs": 4000
        },
        "clientTs": "2026-10-20T10:32:00Z"
    }
    valid_event = {
        "id": str(uuid.uuid4()),
        "type": "flashcard.deck_completed",
        "lectureId": 28,
        "payload": {"totalCards": 10},
        "clientTs": "2026-10-20T10:32:00Z"
    }

    r_batch = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": [poisoned_event, valid_event]}
    )
    assert r_batch.status_code == 200, f"Batch with poisoned event should NOT crash: {r_batch.text}"
    print("  ✅ Batch with poisoned question event processed without failing the transaction!")

    # Verify error was logged to public.ingestion_errors
    conn_check = psycopg2.connect(DATABASE_URL)
    cur_check = conn_check.cursor()
    cur_check.execute("SELECT error_message FROM public.ingestion_errors WHERE user_id = %s;", (user_id,))
    err_row = cur_check.fetchone()
    assert err_row is not None, "Error was NOT logged to public.ingestion_errors!"
    print(f"  ✅ Error logged to public.ingestion_errors: {err_row[0][:50]}...")
    conn_check.close()

def main():
    print("=================================================================")
    print("🌟 COMPLETE PHASE 2 LEITNER & RPC HARDENING TEST SUITE 🌟")
    print("=================================================================")
    verify_database_schema()
    verify_baseline_and_idempotency()
    verify_mistake_notebook_auto_ingestion()
    verify_quiz_daily_replay_guard()
    verify_mistake_review_procedure()
    verify_daily_cap_and_poisoned_batch()
    print("\n" + "=" * 65)
    print("🎉 ALL 6 COMPREHENSIVE PHASE 2 BACKEND TESTS PASSED WITH 100% SUCCESS!")
    print("=================================================================")

if __name__ == "__main__":
    main()
