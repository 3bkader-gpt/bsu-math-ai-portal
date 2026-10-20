import sys
import os
import psycopg2
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")

def cleanup_test_data():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()
    
    print("=" * 60)
    print("🧹 AUDITING & PURGING TEST USERS FROM PRODUCTION")
    print("=" * 60)
    
    # 1. Identify test users (strictly automated test accounts, NEVER real student guests)
    cur.execute("""
        SELECT id, email, created_at 
        FROM auth.users 
        WHERE email LIKE 'test.%' 
           OR email LIKE 'concurrent.%' 
           OR email LIKE 'playwright.%'
           OR email LIKE 'student.%'
           OR email LIKE '%@test.%';
    """)
    test_users = cur.fetchall()
    print(f"Found {len(test_users)} test users in auth.users:")
    for u in test_users:
        print(f"  - ID: {u[0]} | Email: {u[1]} | Created: {u[2]}")
        
    test_ids = [u[0] for u in test_users]
    
    if test_ids:
        # Check foreign key delete cascades or delete manually to ensure clean DB
        print(f"\nDeleting activity data for {len(test_ids)} test users...")
        
        cur.execute("DELETE FROM public.activity_events WHERE user_id = ANY(%s::uuid[]);", (test_ids,))
        print(f"  - Deleted from activity_events: {cur.rowcount}")
        
        cur.execute("DELETE FROM public.mistake_notebook WHERE user_id = ANY(%s::uuid[]);", (test_ids,))
        print(f"  - Deleted from mistake_notebook: {cur.rowcount}")
        
        cur.execute("DELETE FROM public.daily_activity WHERE user_id = ANY(%s::uuid[]);", (test_ids,))
        print(f"  - Deleted from daily_activity: {cur.rowcount}")
        
        cur.execute("DELETE FROM public.user_achievements WHERE user_id = ANY(%s::uuid[]);", (test_ids,))
        print(f"  - Deleted from user_achievements: {cur.rowcount}")
        
        cur.execute("DELETE FROM public.lecture_progress WHERE user_id = ANY(%s::uuid[]);", (test_ids,))
        print(f"  - Deleted from lecture_progress: {cur.rowcount}")
        
        cur.execute("DELETE FROM public.profiles WHERE id = ANY(%s::uuid[]);", (test_ids,))
        print(f"  - Deleted from profiles: {cur.rowcount}")
        
        cur.execute("DELETE FROM public.ingestion_errors WHERE user_id = ANY(%s::uuid[]);", (test_ids,))
        print(f"  - Deleted from ingestion_errors: {cur.rowcount}")
        
        cur.execute("DELETE FROM auth.users WHERE id = ANY(%s::uuid[]);", (test_ids,))
        print(f"  - Deleted from auth.users: {cur.rowcount}")
        
        conn.commit()
        print("\n✅ Successfully purged all test accounts and cascading data from production!")
    else:
        print("\nNo test users found.")
        
    # Check remaining real users
    cur.execute("SELECT count(*) FROM auth.users;")
    remaining_auth = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM public.profiles;")
    remaining_profiles = cur.fetchone()[0]
    print(f"\nRemaining in Production:")
    print(f"  - auth.users: {remaining_auth}")
    print(f"  - profiles: {remaining_profiles}")
    
    conn.close()

if __name__ == "__main__":
    cleanup_test_data()
