import os, sys, dotenv, psycopg2
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv('d:/الكليه/BOT/.env')
url = os.getenv('DATABASE_URL').replace('postgresql+psycopg2://', 'postgres://')
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
for r in cur.fetchall():
    print(f"🚀 [ID {r[0]}] {r[1]} (المحاضرة {r[2]}): {r[3]}")
    print(f"   الحالة: {r[4]} | المرحلة: {r[5]}")
    print(f"   إجمالي الأصول المكتملة: {r[6]} أصل\n")

