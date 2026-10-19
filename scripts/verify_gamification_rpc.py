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

def verify_database_schema():
    print_section("Test 1: Supabase Database Schema & Routines")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    expected_tables = [
        "profiles", 
        "activity_events", 
        "daily_activity", 
        "user_achievements", 
        "lecture_progress"
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
        WHERE routine_schema = 'public' AND routine_name IN ('ingest_events', 'get_cohort_leaderboard');
    """)
    routines = [r[0] for r in cur.fetchall()]
    assert "ingest_events" in routines, "Missing routine ingest_events"
    assert "get_cohort_leaderboard" in routines, "Missing routine get_cohort_leaderboard"
    print("  ✅ Stored procedure public.ingest_events() exists")
    print("  ✅ Stored procedure public.get_cohort_leaderboard() exists")
    conn.close()

def verify_anonymous_auth_and_rpc():
    print_section("Test 2: Anonymous Student Session & Atomic Ingestion RPC")
    client = httpx.Client(timeout=20)
    
    # 1. Provision student user via Admin API
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
            "user_metadata": {"nickname": "عاشق الرياضيات", "persona": "boys"}
        }
    )
    assert r_admin.status_code in (200, 201), f"Admin user creation failed: {r_admin.text}"
    user_id = r_admin.json().get("id")
    print(f"  ✅ Student user created: {user_id} ({student_email})")
    
    # 2. Authenticate to obtain active session JWT
    r_login = client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": student_email, "password": student_pass}
    )
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    access_token = r_login.json().get("access_token")
    print("  ✅ Authenticated session JWT acquired")
    
    # 3. Call ingest_events RPC
    event1_id = str(uuid.uuid4())
    event2_id = str(uuid.uuid4())
    events_payload = [
        {
            "id": event1_id,
            "type": "media.completed",
            "lectureId": 28,
            "payload": {"kind": "audio", "durationSec": 1200},
            "clientTs": "2026-10-19T18:00:00Z"
        },
        {
            "id": event2_id,
            "type": "quiz.finished",
            "lectureId": 28,
            "payload": {"score": 10, "total": 10, "attempt": 1},
            "clientTs": "2026-10-19T18:10:00Z"
        }
    ]
    
    user_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    r_rpc = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": events_payload}
    )
    assert r_rpc.status_code == 200, f"RPC call failed: {r_rpc.text}"
    res = r_rpc.json()
    
    profile = res.get("profile", {})
    awarded_xp = res.get("awardedXp", 0)
    new_badges = res.get("newBadges", [])
    
    print(f"  ✅ Ingested 2 events successfully")
    print(f"  ✅ Awarded XP: {awarded_xp} (Expected: 75)")
    print(f"  ✅ Level Transition: Level {profile.get('level')} (Total XP: {profile.get('totalXp')})")
    print(f"  ✅ Cairo Streak: {profile.get('currentStreak')} day (Date: {profile.get('lastActiveDate')})")
    print(f"  ✅ Badges Unlocked: {new_badges}")
    
    assert awarded_xp == 75, f"Expected 75 XP, got {awarded_xp}"
    assert profile.get("level") == 2, f"Expected level 2, got {profile.get('level')}"
    assert profile.get("currentStreak") == 1, "Expected streak 1"
    assert "first_step" in new_badges, "Missing badge first_step"
    assert "perfect_quiz" in new_badges, "Missing badge perfect_quiz"

    # 4. Test Idempotency (replay exact same events)
    print_section("Test 3: Strict Idempotency & Anti-Replay Guard")
    r_replay = client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
        headers=user_headers,
        json={"events": events_payload}
    )
    assert r_replay.status_code == 200
    replay_res = r_replay.json()
    replay_xp = replay_res.get("awardedXp", 0)
    print(f"  ✅ Replay awarded XP: {replay_xp} (Strictly 0 expected)")
    assert replay_xp == 0, f"Idempotency failed: awarded {replay_xp} XP on replay!"
    assert replay_res.get("profile", {}).get("totalXp") == 75, "Total XP must remain strictly unchanged!"
    print("  ✅ Zero duplicate XP awarded on replayed payload")

    # 5. Row Level Security Verification
    print_section("Test 4: Row Level Security (RLS) Isolation")
    # Anonymous client without user JWT
    anon_client = httpx.Client(timeout=10)
    r_rls = anon_client.get(
        f"{SUPABASE_URL}/rest/v1/activity_events",
        headers={"apikey": SUPABASE_ANON_KEY}
    )
    # Anon cannot read activity_events (returns empty list under RLS)
    assert r_rls.status_code == 200
    assert len(r_rls.json()) == 0, "RLS violated: unauthenticated user read activity_events!"
    print("  ✅ RLS Active: Direct unauthorized reads to activity_events returned 0 rows")

    # Public Leaderboard check
    r_lb = anon_client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/get_cohort_leaderboard",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"limit_count": 10}
    )
    assert r_lb.status_code == 200, f"Leaderboard call failed: {r_lb.text}"
    lb_entries = r_lb.json()
    print(f"  ✅ Public Cohort Leaderboard returned {len(lb_entries)} ranked entries")
    assert len(lb_entries) >= 1, "Leaderboard should contain at least our active student"
    top = lb_entries[0]
    print(f"  ✅ Top Student on Leaderboard: Rank #{top.get('rank')} - {top.get('nickname')} ({top.get('total_xp')} XP, Level {top.get('level')})")

def main():
    print("=================================================================")
    print("🌟 PHASE 2 SUPABASE & RPC VERIFICATION SUITE 🌟")
    print("=================================================================")
    verify_database_schema()
    verify_anonymous_auth_and_rpc()
    print("\n" + "=" * 65)
    print("🎉 ALL PHASE 2 BACKEND & RPC TESTS PASSED WITH 100% SUCCESS!")
    print("=================================================================")

if __name__ == "__main__":
    main()
