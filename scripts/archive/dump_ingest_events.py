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
cur.execute("SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'ingest_events';")
row = cur.fetchone()
if row:
    print(f"INGEST_EVENTS_SQL_LEN: {len(row[0])}")
    with open("scripts/ingest_events_def.sql", "w", encoding="utf-8") as f:
        f.write(row[0])
    print("Saved to scripts/ingest_events_def.sql")
else:
    print("Function not found")
conn.close()
