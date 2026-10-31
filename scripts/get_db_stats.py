import os
import sys
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding='utf-8')

db_url = "postgresql+psycopg2://postgres.cjmlnpdtfclzcvehebsv:AcademicDB_2026_Secure!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
engine = create_engine(db_url)

with engine.connect() as conn:
    print("=== ALL STUDENT PROFILES IN DATABASE ===")
    profiles = conn.execute(text("""
        SELECT id, nickname, persona, created_at, updated_at, last_active_tab, last_active_lecture_id
        FROM public.profiles 
        ORDER BY created_at DESC;
    """)).fetchall()
    print(f"Total Student Profiles: {len(profiles)}")
    for idx, p in enumerate(profiles, 1):
        print(f"{idx}. {p[1]} | طابع: {p[2]} | مسجل بتاريخ: {p[3].strftime('%Y-%m-%d %H:%M')} | آخر نشاط: {p[4].strftime('%Y-%m-%d %H:%M') if p[4] else 'N/A'} | آخر تاب: {p[5]}")

    print("\n=== ACTIVITY EVENTS COLUMNS ===")
    cols_ae = conn.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'activity_events';
    """)).fetchall()
    print("Columns:", [c[0] for c in cols_ae])

    print("\n=== COHORT CHALLENGE CONTRIBUTIONS (QUESTIONS SOLVED) ===")
    try:
        total_solved = conn.execute(text("SELECT count(*) FROM public.cohort_challenge_contributions;")).scalar()
        print(f"Total quiz questions contributed to cohort challenge: {total_solved}")
        
        contributions = conn.execute(text("""
            SELECT user_id, count(*) as count 
            FROM public.cohort_challenge_contributions 
            GROUP BY user_id 
            ORDER BY count DESC;
        """)).fetchall()
        print("Top contributors by user_id:")
        for c in contributions:
            print(f" - User {c[0]}: {c[1]} questions")
    except Exception as e:
        print("Error reading cohort_challenge_contributions:", e)

    print("\n=== LECTURE STUDY PROGRESS ===")
    try:
        progress = conn.execute(text("""
            SELECT l.title, sub.name, count(*) as readers
            FROM public.lecture_progress lp
            JOIN public.lectures l ON lp.lecture_id = l.id
            JOIN public.subjects sub ON l.subject_id = sub.id
            GROUP BY l.title, sub.name
            ORDER BY readers DESC
            LIMIT 10;
        """)).fetchall()
        print(f"Lectures with saved progress: {len(progress)}")
        for pr in progress:
            print(f" - [{pr[1]}] {pr[0]} -> {pr[2]} طلاب")
    except Exception as e:
        print("Error reading lecture_progress:", e)

    print("\n=== MISTAKE NOTEBOOK (كراسة الأخطاء) ===")
    try:
        mistakes = conn.execute(text("SELECT count(*) FROM public.mistake_notebook;")).scalar()
        print(f"Total questions stored in mistake_notebook across all students: {mistakes}")
    except Exception as e:
        print("Error reading mistake_notebook:", e)
