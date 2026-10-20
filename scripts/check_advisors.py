import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv('DATABASE_URL', '').replace('postgresql+psycopg2://', 'postgresql://')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# 1. Check RLS on tables
cur.execute("""
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('ingestion_errors', 'mistake_notebook', 'activity_events');
""")
print("=== Table RLS Status ===")
for row in cur.fetchall():
    print(f"Table: {row[0]}, RLS Enabled: {row[1]}")

# 2. Check policies on ingestion_errors
cur.execute("SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = 'ingestion_errors';")
print("\n=== ingestion_errors Policies (Should be None) ===")
policies = cur.fetchall()
print("Count:", len(policies), policies)

# 3. Check search_path and permissions on functions
cur.execute("""
SELECT p.proname, p.prosecdef, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname IN ('ingest_events', 'submit_mistake_review');
""")
print("\n=== Functions search_path & Security Definer ===")
for row in cur.fetchall():
    print(f"Function: {row[0]}, SecurityDefiner: {row[1]}, Config(search_path): {row[2]}")

# 4. Check grants on functions
cur.execute("""
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name IN ('ingest_events', 'submit_mistake_review')
ORDER BY routine_name, grantee;
""")
print("\n=== Routine Privileges ===")
for row in cur.fetchall():
    print(f"Function: {row[0]}, Grantee: {row[1]}, Privilege: {row[2]}")

conn.close()
