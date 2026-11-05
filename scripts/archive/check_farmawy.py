import psycopg2, os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL').replace('postgresql+psycopg2://', 'postgresql://'))
cur = conn.cursor()
uid = 'b193b331-c4e0-430a-9652-c066b0a3887e'
cur.execute('SELECT count(*) FROM public.activity_events WHERE user_id = %s;', (uid,))
print('Activity Events for Farmawy (Test User):', cur.fetchone()[0])
cur.execute('SELECT count(*) FROM public.cohort_challenge_contributions WHERE user_id = %s;', (uid,))
print('Cohort Challenge Contributions for Farmawy:', cur.fetchone()[0])
cur.execute('SELECT count(*) FROM public.mistake_notebook WHERE user_id = %s;', (uid,))
print('Mistake notebook entries for Farmawy:', cur.fetchone()[0])
conn.close()
