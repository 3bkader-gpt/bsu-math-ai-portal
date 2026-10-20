import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")

def run_monitor():
    if not DATABASE_URL:
        print("❌ DATABASE_URL is not set.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=RealDictCursor)

    print("=" * 65)
    print("📊 BSU MATH PORTAL — SOFT LAUNCH MONITORING DASHBOARD")
    print("=" * 65)

    # 1. Check Ingestion Errors (Crucial for silent failures)
    print("\n🔍 1. INGESTION ERRORS (public.ingestion_errors):")
    cur.execute("""
        SELECT id, user_id, event_type, error_message, created_at 
        FROM public.ingestion_errors 
        ORDER BY created_at DESC 
        LIMIT 10;
    """)
    errors = cur.fetchall()
    if not errors:
        print("   ✅ Zero ingestion errors recorded! All telemetry events flowing cleanly.")
    else:
        print(f"   ⚠️ Found {len(errors)} recent ingestion errors:")
        for err in errors:
            print(f"      - [{err['created_at']}] Event: {err['event_type']} | User: {err['user_id']} | Msg: {err['error_message']}")

    # 2. Total Registered Students & Activity
    print("\n👥 2. REAL COHORT REGISTRATIONS:")
    cur.execute("SELECT count(*) as count FROM auth.users;")
    auth_count = cur.fetchone()['count']
    cur.execute("SELECT count(*) as count FROM public.profiles;")
    profiles_count = cur.fetchone()['count']
    cur.execute("SELECT count(*) as count FROM public.activity_events;")
    events_count = cur.fetchone()['count']
    print(f"   - Total Student Accounts (auth.users): {auth_count}")
    print(f"   - Profiles Provisioned: {profiles_count}")
    print(f"   - Total Activities Ingested: {events_count}")

    # 3. KPI: Daily Active Users & Cohort Summary
    print("\n📈 3. DAILY ACTIVE USERS (v_kpi_daily_cohort_summary):")
    try:
        cur.execute("SELECT * FROM public.v_kpi_daily_cohort_summary ORDER BY day DESC LIMIT 7;")
        dau_rows = cur.fetchall()
        if not dau_rows:
            print("   (No student activity recorded yet today)")
        else:
            for r in dau_rows:
                print(f"   - Date (Cairo): {r['day']} | DAU: {r['active_students_dau']} students | Total XP: {r['total_xp_distributed']} | Avg XP: {r['avg_xp_per_student']} | Active Mins: {r['total_active_minutes']}")
    except Exception as e:
        print(f"   ⚠️ Could not query v_kpi_daily_cohort_summary: {e}")

    # 4. KPI: Leitner Mistake Notebook Health
    print("\n📓 4. LEITNER NOTEBOOK HEALTH (v_kpi_mistake_review_completion):")
    try:
        cur.execute("SELECT * FROM public.v_kpi_mistake_review_completion;")
        leitner_rows = cur.fetchall()
        if not leitner_rows:
            print("   (No mistake cards recorded yet)")
        else:
            for r in leitner_rows:
                print(f"   - Total Mistakes: {r['total_mistakes_recorded']} | Reviewed (Box > 1): {r['mistakes_successfully_reviewed']} | Mastered: {r['mistakes_fully_mastered']} | Due Today: {r['currently_due_count']} | Review Rate: {r['review_completion_pct']}%")
    except Exception as e:
        print(f"   ⚠️ Could not query v_kpi_mistake_review_completion: {e}")

    # 5. KPI: Cohort Retention (D1 & D7)
    print("\n🔄 5. COHORT RETENTION (v_kpi_retention_d7):")
    try:
        cur.execute("SELECT * FROM public.v_kpi_retention_d7 ORDER BY signup_day DESC LIMIT 7;")
        ret_rows = cur.fetchall()
        if not ret_rows:
            print("   (Retention calculations will appear after Day 1/Day 7)")
        else:
            for r in ret_rows:
                print(f"   - Cohort: {r['signup_day']} | Size: {r['cohort_size']} | D1: {r['retained_d1']} ({r['d1_pct']}%) | D7: {r['retained_d7']} ({r['d7_pct']}%)")
    except Exception as e:
        print(f"   ⚠️ Could not query v_kpi_retention_d7: {e}")

    # 6. KPI: Time to First Action
    print("\n⏱️ 6. TIME TO FIRST ACTION (v_kpi_time_to_first_action):")
    try:
        cur.execute("SELECT * FROM public.v_kpi_time_to_first_action;")
        tfa_rows = cur.fetchall()
        if not tfa_rows:
            print("   (Awaiting first student sessions)")
        else:
            for r in tfa_rows:
                print(f"   - Action: {r['first_action_type']} | Sessions: {r['session_count']} | Median: {r['median_time_to_first_action_sec']}s | Avg: {r['avg_time_to_first_action_sec']}s")
    except Exception as e:
        print(f"   ⚠️ Could not query v_kpi_time_to_first_action: {e}")

    # 7. XP Pacing & Cap Monitor
    print("\n⚡ 7. XP PACING & 400 XP CAP REACHED TODAY:")
    try:
        cur.execute("""
            SELECT u.email, p.nickname, d.xp_earned, d.day
            FROM public.daily_activity d
            JOIN public.profiles p ON p.id = d.user_id
            JOIN auth.users u ON u.id = d.user_id
            WHERE d.day = (now() AT TIME ZONE 'Africa/Cairo')::DATE
            ORDER BY d.xp_earned DESC
            LIMIT 5;
        """)
        xp_leaders = cur.fetchall()
        if not xp_leaders:
            print("   (Zero XP logged so far today)")
        else:
            for l in xp_leaders:
                cap_flag = "⚠️ [CAPPED AT 400 XP]" if l['xp_earned'] >= 400 else "✅ [Normal Pacing]"
                print(f"   - {l['nickname']} ({l['email']}): {l['xp_earned']} XP {cap_flag}")
    except Exception as e:
        print(f"   ⚠️ Could not query XP pacing: {e}")

    print("\n" + "=" * 65)
    conn.close()

if __name__ == "__main__":
    run_monitor()
