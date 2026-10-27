import os
from dotenv import load_dotenv
load_dotenv('.env')
from supabase import create_client

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
sb = create_client(url, key)

res = sb.table('media_handoffs').select('*').order('created_at', desc=True).limit(10).execute().data
for h in res:
    hid = h.get('id', '')
    lid = h.get('lecture_id')
    st = h.get('status')
    nb = h.get('notebook_id') or ''
    err = (h.get('error_message') or '')[:80]
    print(f"Handoff {hid[:8]} | Lec {lid} | Status: {st} | NB: {nb[:8]} | Err: {err}")
