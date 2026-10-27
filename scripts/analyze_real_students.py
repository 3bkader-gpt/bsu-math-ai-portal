import os
from dotenv import load_dotenv
load_dotenv('.env')
from supabase import create_client
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY'))

res = sb.table('profiles').select('id, nickname, total_xp, level, current_streak, created_at, updated_at').order('created_at', desc=True).execute().data

today_profiles = [p for p in res if '2026-10-27' in (p.get('created_at') or '') or '2026-10-28' in (p.get('created_at') or '')]
older_profiles = [p for p in res if p not in today_profiles]

print(f"Total profiles in DB: {len(res)}")
print(f"Created TODAY (27/28 Oct): {len(today_profiles)}")
print(f"Older / Test profiles: {len(older_profiles)}")

print("\n--- All profiles created TODAY ---")
for p in today_profiles:
    nick = p.get('nickname')
    xp = p.get('total_xp')
    streak = p.get('current_streak')
    created = p.get('created_at')
    print(f"Nickname: {nick:25} | XP: {xp:4} | Streak: {streak} | Created: {created}")

# Also check activity events created today
evs = sb.table('activity_events').select('user_id, event_type, server_ts, created_at').order('server_ts', desc=True).limit(50).execute().data
print(f"\n--- Recent Activity Events ({len(evs)}) ---")
unique_event_users = set(e.get('user_id') for e in evs)
print(f"Unique active users in recent events: {len(unique_event_users)}")
for e in evs[:15]:
    print(f"User: {e.get('user_id')[:8]}.. | Type: {e.get('event_type'):20} | Time: {e.get('server_ts') or e.get('created_at')}")
