import sys
import os
import uuid
import datetime
import zoneinfo
import httpx
import psycopg2
from concurrent.futures import ThreadPoolExecutor
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

def get_cairo_today():
    return datetime.datetime.now(zoneinfo.ZoneInfo("Africa/Cairo")).strftime("%Y-%m-%d")

def create_test_student():
    client = httpx.Client(timeout=20)
    test_id = str(uuid.uuid4())
    email = f"concurrent.{test_id[:8]}@bsu-math.internal"
    pwd = f"Pass_{test_id[:12]}"
    
    r_admin = client.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
        },
        json={
            "email": email,
            "password": pwd,
            "email_confirm": True,
            "user_metadata": {"nickname": f"تزامن_{test_id[:4]}", "persona": "boys"}
        }
    )
    assert r_admin.status_code in (200, 201), f"Admin creation failed: {r_admin.text}"
    user_id = r_admin.json().get("id")
    
    r_login = client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": pwd}
    )
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    token = r_login.json().get("access_token")
    return user_id, token

def test_concurrent_cap():
    print("\n" + "=" * 65)
    print("🚀 TRUE CONCURRENCY TEST: SELECT ... FOR UPDATE & 400 XP CAP")
    print("=" * 65)
    
    user_id, token = create_test_student()
    print(f"Created concurrent test student: {user_id}")
    
    cairo_today = get_cairo_today()
    
    # 1. Direct DB seed: set student to 380 XP today (20 XP remaining before 400 cap)
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO public.daily_activity (user_id, day, xp_earned, seconds_active, items_completed)
        VALUES (%s, %s, 380, 1800, 10)
        ON CONFLICT (user_id, day) DO UPDATE SET xp_earned = 380;
    """, (user_id, cairo_today))
    cur.execute("""
        UPDATE public.profiles SET total_xp = 380 WHERE id = %s;
    """, (user_id,))
    conn.close()
    print("Seed complete: Student currently has 380 XP (Cap is 400 XP).")
    
    # 2. Prepare 2 concurrent batches: each asking for 30 XP (audio.completed = 25 XP + video.streak_5min = 10 XP = 35 XP)
    # If concurrency lock fails, 380 + 35 + 35 = 450 XP (violates 400 cap).
    batch_a = [
        {
            "id": str(uuid.uuid4()),
            "type": "media.completed",
            "lectureId": 10,
            "payload": {"kind": "audio", "durationSec": 600},
            "clientTs": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    ]
    batch_b = [
        {
            "id": str(uuid.uuid4()),
            "type": "media.completed",
            "lectureId": 11,
            "payload": {"kind": "video", "durationSec": 600},
            "clientTs": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    ]
    
    def send_batch(batch, batch_name):
        client = httpx.Client(timeout=20)
        resp = client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/ingest_events",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"events": batch}
        )
        return batch_name, resp.status_code, resp.json()
    
    print("\nFiring Batch A and Batch B simultaneously with ThreadPoolExecutor...")
    with ThreadPoolExecutor(max_workers=2) as executor:
        f_a = executor.submit(send_batch, batch_a, "Batch A")
        f_b = executor.submit(send_batch, batch_b, "Batch B")
        res_a = f_a.result()
        res_b = f_b.result()
    
    print(f"  {res_a[0]}: HTTP {res_a[1]} -> Awarded XP: {res_a[2].get('awardedXp')}")
    print(f"  {res_b[0]}: HTTP {res_b[1]} -> Awarded XP: {res_b[2].get('awardedXp')}")
    
    awarded_a = res_a[2].get('awardedXp', 0)
    awarded_b = res_b[2].get('awardedXp', 0)
    total_awarded = awarded_a + awarded_b
    
    # 3. Verify final DB state
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT xp_earned FROM public.daily_activity WHERE user_id = %s AND day = %s;", (user_id, cairo_today))
    db_daily_xp = cur.fetchone()[0]
    
    cur.execute("SELECT total_xp FROM public.profiles WHERE id = %s;", (user_id,))
    db_total_xp = cur.fetchone()[0]
    conn.close()
    
    print(f"\nFinal State in DB:")
    print(f"  daily_activity.xp_earned: {db_daily_xp} (Max allowed: 400)")
    print(f"  profiles.total_xp: {db_total_xp} (Max allowed: 400)")
    print(f"  Total incremental XP awarded across both batches: {total_awarded}")
    
    assert db_daily_xp <= 400, f"VIOLATION: daily_activity exceeded 400 XP! Got: {db_daily_xp}"
    assert db_total_xp <= 400, f"VIOLATION: profile total_xp exceeded 400 XP! Got: {db_total_xp}"
    assert total_awarded == 20, f"VIOLATION: Expected exactly 20 XP awarded to reach 400 cap, got: {total_awarded}"
    assert db_daily_xp == 400, f"Expected exactly 400 XP in daily_activity, got: {db_daily_xp}"
    
    print("\n✅ CONCURRENCY SUCCESS: FOR UPDATE lock serialized the batches perfectly!")
    print("   Total XP is strictly capped at 400, zero leak under concurrent load!")

if __name__ == "__main__":
    test_concurrent_cap()
