import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env')

dsn = os.getenv('DATABASE_URL').replace('postgresql+psycopg2://', 'postgresql://')
conn = psycopg2.connect(dsn)
conn.autocommit = True
cur = conn.cursor()

migration_file = 'supabase/migrations/20261026_cohort_challenges.sql'
with open(migration_file, 'r', encoding='utf-8') as f:
    sql = f.read()

print("Applying 20261026_cohort_challenges.sql...")
cur.execute(sql)
print("Migration applied successfully!")

# Verify tables
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'cohort%';")
tables = [r[0] for r in cur.fetchall()]
print(f"Created tables: {tables}")

# Verify active challenge row
cur.execute("SELECT id, title, target_count, start_date, end_date, is_active FROM public.cohort_challenges;")
rows = cur.fetchall()
print(f"Active challenges ({len(rows)}):")
for r in rows:
    print(f"  - ID: {r[0]} | Title: {r[1]} | Target: {r[2]} | Start: {r[3]} | End: {r[4]} | Active: {r[5]}")

# Test RPC get_active_cohort_challenge
cur.execute("SELECT * FROM public.get_active_cohort_challenge(NULL);")
res = cur.fetchall()
print(f"get_active_cohort_challenge(NULL) output: {res}")
