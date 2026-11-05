import os
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env')
from supabase import create_client
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY'))

profiles = sb.table('profiles').select('id, nickname, total_xp, created_at').order('created_at', desc=True).execute().data

print(f"Total Profiles: {len(profiles)}")
for i, p in enumerate(profiles, 1):
    print(f"{i:3d}. [{p.get('created_at')[:19]}] {p.get('nickname')} (XP: {p.get('total_xp')})")
