import os
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env')
from supabase import create_client
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY'))

page = 1
all_users = []
while True:
    res = sb.auth.admin.list_users(page=page, per_page=100)
    users = res if isinstance(res, list) else getattr(res, 'users', [])
    if not users:
        break
    all_users.extend(users)
    if len(users) < 100:
        break
    page += 1

print(f"Total Auth Users retrieved: {len(all_users)}")

keywords = ['yara', 'يارا', 'mostafa', 'مصطف', 'ahmed', 'احمد']
matched_users = []
for u in all_users:
    email = u.email or ''
    meta = str(u.user_metadata or '')
    if any(k in (email + meta).lower() for k in keywords):
        matched_users.append((u.id, email, meta, u.created_at))

print(f"Matched Auth Users ({len(matched_users)}):")
for uid, email, meta, cat in matched_users:
    print(f"[{cat[:19]}] UID: {uid} | Email: {email} | Meta: {meta}")
