import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://"))
cur = conn.cursor()
cur.execute("SELECT id, user_id, event_type, server_ts FROM public.activity_events WHERE id = %s;", ('48864cda-81de-439a-b20e-ace79760399c',))
row = cur.fetchone()
print("EVENT_QUERY_RESULT:", row)
conn.close()
