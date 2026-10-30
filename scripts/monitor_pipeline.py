import os
import sys
import time
import psycopg2
import dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

dotenv.load_dotenv('d:/الكليه/BOT/.env')
url = os.getenv('DATABASE_URL').replace('postgresql+psycopg2://', 'postgres://')

print("Starting pipeline monitor for lectures 70, 71, 72...\n")

while True:
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()
        cur.execute('''
            SELECT l.id, s.name, l.lecture_num, l.title, l.status, l.stage_info,
                   (SELECT count(*) FROM media_assets a WHERE a.lecture_id = l.id) as asset_count
            FROM lectures l
            JOIN subjects s ON l.subject_id = s.id
            WHERE l.id IN (70, 71, 72)
            ORDER BY l.id
        ''')
        rows = cur.fetchall()
        cur.close()
        conn.close()

        all_completed = True
        status_line = []
        for r in rows:
            status_line.append(f"Lec {r[0]} ({r[1]} {r[2]}): {r[4]} [{r[6]} assets]")
            if r[4] != 'completed':
                all_completed = False

        print(f"[{time.strftime('%H:%M:%S')}] " + " | ".join(status_line), flush=True)

        if all_completed and len(rows) == 3:
            print("\n🎉 ALL 3 LECTURES ARE COMPLETED!", flush=True)
            break

        time.sleep(25)
    except Exception as e:
        print(f"Error checking DB: {e}")
        time.sleep(15)
