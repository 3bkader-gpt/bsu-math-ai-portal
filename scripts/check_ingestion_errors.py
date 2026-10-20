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
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'ingestion_errors';")
print("Columns:", [r[0] for r in cur.fetchall()])

cur.execute("SELECT * FROM public.ingestion_errors ORDER BY created_at DESC LIMIT 5;")
for r in cur.fetchall():
    print("  Row:", r)

conn.close()
