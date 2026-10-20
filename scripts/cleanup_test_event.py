import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+psycopg2://', 'postgresql://')
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("DELETE FROM public.activity_events WHERE id IN ('0717c6bc-bdfe-442a-ad95-f22d2faa302c', '48864cda-81de-439a-b20e-ace79760399c');")
conn.commit()
print("Cleaned up test rows:", cur.rowcount)
conn.close()
