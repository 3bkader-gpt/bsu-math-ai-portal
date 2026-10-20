import os
import sys
import psycopg2
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Find mistakes currently in mistake_notebook
cur.execute("""
    SELECT id, user_id, lecture_id, question_hash, question_text, box_level, next_review_date
    FROM public.mistake_notebook
    ORDER BY created_at DESC
    LIMIT 10;
""")
rows = cur.fetchall()
print(f"Found {len(rows)} mistakes in mistake_notebook:")
for r in rows:
    print(f"  - ID: {r[0]} | User: {r[1]} | Box: {r[5]} | Due: {r[6]} | Q: {r[4][:40]}...")

# Update all mistakes to be due today
cur.execute("""
    UPDATE public.mistake_notebook
    SET next_review_date = (now() AT TIME ZONE 'Africa/Cairo')::DATE;
""")
conn.commit()
print("✅ Successfully updated next_review_date = CURRENT_DATE (Cairo) for all mistakes!")

conn.close()
