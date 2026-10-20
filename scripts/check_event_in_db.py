import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

event_id = sys.argv[1]
db_url = os.getenv('DATABASE_URL', '').replace('postgresql+psycopg2://', 'postgresql://')
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT id, user_id, event_type, server_ts FROM public.activity_events WHERE id = %s;", (event_id,))
row = cur.fetchone()
if row:
    print('FOUND_IN_DB')
else:
    print('NOT_FOUND_IN_DB')
conn.close()
