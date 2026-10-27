import os, sys
from dotenv import load_dotenv
load_dotenv('.env')
from supabase import create_client

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
sb = create_client(url, key)

for s_id, s_name in [(3, 'تدريس مصغر - د/ عبدالرحمن برعي'), (5, 'تكنولوجيا التعليم والتحول الرقمي - د/ إيمان')]:
    print(f"\n==================== {s_name} (Subject {s_id}) ====================")
    lecs = sb.table('lectures').select('id, lecture_num, title').eq('subject_id', s_id).order('lecture_num').execute().data
    complete_count = 0
    for l in lecs:
        lid = l['id']
        lnum = l['lecture_num']
        assets = sb.table('media_assets').select('asset_type, telegram_message_id').eq('lecture_id', lid).execute().data
        a_msg = [a['telegram_message_id'] for a in assets if a['asset_type'] == 'audio']
        v_msg = [a['telegram_message_id'] for a in assets if a['asset_type'] == 'video']
        
        has_a = len(a_msg) > 0 and a_msg[0] is not None
        has_v = len(v_msg) > 0 and v_msg[0] is not None
        
        if has_a and has_v:
            status = '✅ مكتمل (صوت وفيديو)'
            complete_count += 1
        elif has_a:
            status = '⚠️ صوت فقط (بانتظار الفيديو)'
        elif has_v:
            status = '⚠️ فيديو فقط'
        else:
            status = '❌ غير متوفر'
        print(f"Lec {lnum} (ID {lid}): [Audio: {a_msg[0] if has_a else None} | Video: {v_msg[0] if has_v else None}] -> {status}")
    print(f"المكتمل: {complete_count} من {len(lecs)}")
