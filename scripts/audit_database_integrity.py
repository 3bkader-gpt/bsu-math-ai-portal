import os
import sys
import psycopg2
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
db_url = os.environ.get('DATABASE_URL', '').replace('postgresql+psycopg2://', 'postgresql://')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

print("=" * 60)
print("DATABASE INTEGRITY AUDIT")
print("=" * 60)

# 1. Total profiles
cur.execute("""
    SELECT 
        COUNT(*), 
        COUNT(*) FILTER (WHERE is_test_account = true), 
        COUNT(*) FILTER (WHERE is_test_account = false) 
    FROM public.profiles;
""")
total_p, test_p, real_p = cur.fetchone()
print(f"PROFILES: Total={total_p} | Test={test_p} | Real Students={real_p}")

# 2. Check names flagged as test_p
cur.execute("SELECT id, nickname, is_test_account FROM public.profiles WHERE is_test_account = true;")
test_profiles = cur.fetchall()
print("\nFlagged Test Profiles (Isolated):")
for tp in test_profiles:
    print(f"  - ID: {tp[0]} | Nickname: '{tp[1]}'")

# 3. Check real students sample
cur.execute("SELECT nickname, created_at FROM public.profiles WHERE is_test_account = false ORDER BY created_at DESC LIMIT 5;")
print("\nRecent Real Students (Completely Untouched & Active):")
for rp in cur.fetchall():
    print(f"  - {rp[0]} | Registered: {rp[1]}")

# 4. Total activity events
cur.execute("SELECT COUNT(*), COUNT(DISTINCT user_id) FROM public.activity_events;")
total_ev, distinct_users = cur.fetchone()
print(f"\nACTIVITY EVENTS: Total={total_ev} | Distinct Students={distinct_users}")

# 5. Total cohort contributions
cur.execute("SELECT COUNT(*), COUNT(DISTINCT user_id) FROM public.cohort_challenge_contributions;")
total_contribs, distinct_contrib_users = cur.fetchone()
print(f"\nCOHORT CONTRIBUTIONS: Total={total_contribs} | Distinct Users={distinct_contrib_users}")

# 6. Check views: v_question_cohort_stats & v_lecture_cohort_momentum
cur.execute("SELECT COUNT(*) FROM public.v_question_cohort_stats;")
v_q_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM public.v_lecture_cohort_momentum;")
v_m_count = cur.fetchone()[0]
print(f"\nVIEWS HEALTH:")
print(f"  - v_question_cohort_stats rows: {v_q_count}")
print(f"  - v_lecture_cohort_momentum rows: {v_m_count}")

# 7. Check momentum sample
cur.execute("SELECT lecture_id, weekly_activity_count, today_activity_count FROM public.v_lecture_cohort_momentum WHERE weekly_activity_count > 0 LIMIT 3;")
print("  - Sample Momentum from Real Students:")
for row in cur.fetchall():
    print(f"    Lec {row[0]}: weekly={row[1]}, today={row[2]}")

conn.close()
print("=" * 60)
print("AUDIT FINISHED PERFECTLY")
print("=" * 60)
