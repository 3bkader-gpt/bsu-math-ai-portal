import os
from dotenv import load_dotenv
load_dotenv('.env')
from supabase import create_client
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY'))

res = sb.table('profiles').select('id, nickname, total_xp, level, current_streak, created_at, updated_at').order('created_at', desc=True).execute().data

# Filter from today 10:20 AM Cairo (07:20 UTC) onwards
today_profiles = [p for p in res if (p.get('created_at') or '') >= '2026-10-27T07:20:00']

named_students = [p for p in today_profiles if p.get('nickname') and p.get('nickname') != 'عاشق الرياضيات']
placeholder_students = [p for p in today_profiles if p.get('nickname') == 'عاشق الرياضيات']

print(f"Total Profiles created since 10:24 AM: {len(today_profiles)}")
print(f"Students with Real/Custom Names: {len(named_students)}")
print(f"Students with default name (عاشق الرياضيات): {len(placeholder_students)}")

xp_earners = [p for p in today_profiles if (p.get('total_xp') or 0) > 0]
print(f"Students who actively completed quizzes/tasks (XP > 0): {len(xp_earners)}")
for p in xp_earners:
    print(f"  ⭐ {p.get('nickname')} -> XP: {p.get('total_xp')}")
