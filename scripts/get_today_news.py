import os
import sys
import psycopg2
import dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

dotenv.load_dotenv('d:/الكليه/BOT/.env')
url = os.getenv('DATABASE_URL').replace('postgresql+psycopg2://', 'postgres://')
conn = psycopg2.connect(url)
cur = conn.cursor()

print("=" * 65)
print("📰 BSU MATH PORTAL - TODAY'S HIGHLIGHTS (OCT 31, 2026)")
print("=" * 65)

# 1. New student profiles created today
cur.execute("""
    SELECT nickname, created_at, total_xp, level
    FROM profiles
    WHERE created_at >= '2026-10-31 00:00:00+00'
    ORDER BY created_at DESC;
""")
profiles_today = cur.fetchall()
print(f"\n👤 New Students Joined Today: {len(profiles_today)}")
for r in profiles_today:
    print(f"   • {r[0]} | انضم: {r[1].strftime('%H:%M Cairo')} | XP: {r[2]}")

# 2. Activity events logged today
cur.execute("""
    SELECT p.nickname, a.event_type, a.server_ts, a.payload
    FROM activity_events a
    LEFT JOIN profiles p ON a.user_id = p.id
    WHERE a.server_ts >= '2026-10-31 00:00:00+00'
    ORDER BY a.server_ts DESC;
""")
acts = cur.fetchall()
print(f"\n⚡ Total Activities Performed Today: {len(acts)}")
# Summary per user
user_acts = {}
for r in acts:
    nick = r[0] or "Anonymous Student"
    user_acts[nick] = user_acts.get(nick, 0) + 1

for nick, count in user_acts.items():
    print(f"   • {nick}: قام بـ {count} نشاط مذاكرة")

print("\n🕒 Recent Activities (Last 10):")
for r in acts[:10]:
    t_str = r[2].strftime('%H:%M:%S')
    print(f"   - [{t_str}] {r[0] or 'Anonymous'}: {r[1]} | payload: {r[3]}")

# 3. Push Subscriptions
cur.execute("SELECT count(*), max(created_at) FROM push_subscriptions;")
sub_count, last_sub = cur.fetchone()
print(f"\n🔔 Web Push Subscribers: {sub_count} مشترك")
if last_sub:
    print(f"   • آخر اشتراك: {last_sub}")

# 4. Lectures status
cur.execute("""
    SELECT status, count(*) 
    FROM lectures 
    GROUP BY status;
""")
print(f"\n📚 Lectures Pipeline Breakdown:")
for st in cur.fetchall():
    print(f"   • {st[0]}: {st[1]} محاضرات")

print("\n🔍 حالة المحاضرة 73 (هندسة تفاضلية - المحاضرة 6):")
cur.execute("""
    SELECT l.id, s.name, l.lecture_num, l.title, l.doctor, l.status, l.stage_info
    FROM lectures l
    JOIN subjects s ON l.subject_id = s.id
    WHERE l.id = 73;
""")
l73 = cur.fetchone()
if l73:
    print(f"   • الحالة: {l73[5]} | المرحلة: {l73[6]}")
    cur.execute("""
        SELECT id, asset_type, title, telegram_message_id, file_size_bytes
        FROM media_assets
        WHERE lecture_id = 73
        ORDER BY id;
    """)
    assets73 = cur.fetchall()
    print(f"   • إجمالي الأصول المنجزة: {len(assets73)} أصل")
    for a in assets73:
        size_kb = (a[4] // 1024) if a[4] else 0
        print(f"      - [{a[1]}] {a[2]} | الحجم: {size_kb} KB | تليجرام: {a[3]}")
else:
    print("   • لم يتم العثور على المحاضرة 73")

# 5. Latest Notifications
print("\n🔔 أحدث الإشعارات المسجلة بالمنصة:")
cur.execute("""
    SELECT id, lecture_id, subject_name, lecture_num, title, message, created_at
    FROM notifications
    ORDER BY id DESC
    LIMIT 3;
""")
for n in cur.fetchall():
    print(f"   • [{n[6].strftime('%H:%M:%S')}] {n[4]}")
    print(f"     رسالة: {n[5][:100]}...")

# 6. Ingestion errors check today
cur.execute("""
    SELECT count(*) FROM ingestion_errors WHERE created_at >= '2026-10-31 00:00:00+00';
""")
err_cnt = cur.fetchone()[0]
print(f"\n🛡️ System Ingestion Errors Today: {err_cnt} أخطاء")

# 7. Current Leaderboard
print("\n🏆 لوحة شرف الدفعة (Top 10 الآن):")
cur.execute("""
    SELECT nickname, total_xp, level, current_streak, updated_at
    FROM profiles
    ORDER BY total_xp DESC
    LIMIT 10;
""")
for i, s in enumerate(cur.fetchall(), 1):
    last_act = s[4].strftime('%H:%M') if s[4] else 'N/A'
    print(f"   {i}. {s[0]:25} | {s[1]:4} XP | Level {s[2]} | Streak {s[3]} | آخر نشاط: {last_act}")

cur.close()
conn.close()
