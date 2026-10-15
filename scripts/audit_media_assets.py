import urllib.request
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbWxucGR0ZmNsemN2ZWhlYnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjUyMDIsImV4cCI6MjEwNzQwMTIwMn0.NipIyq1IfvcjXiI9iL4KjIq-B-OK60AI0guQZz5PB8k'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Accept': 'application/json'
}

req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/lectures?select=id,lecture_num,title,media_assets(*)&order=id.asc", headers=headers)
data = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))

print(f"Total lectures in Supabase: {len(data)}")
for lec in data:
    assets = lec.get('media_assets', [])
    audio = next((a for a in assets if a['asset_type'] == 'audio'), None)
    video = next((a for a in assets if a['asset_type'] == 'video'), None)
    
    audio_msg = audio.get('telegram_message_id') if audio else None
    video_msg = video.get('telegram_message_id') if video else None
    
    audio_status = f"✅ TG #{audio_msg} (Asset {audio['id']})" if (audio and audio_msg) else ("⚠️ Record exists but NO TG MSG" if audio else "❌ No Asset")
    video_status = f"✅ TG #{video_msg} (Asset {video['id']})" if (video and video_msg) else ("⚠️ Record exists but NO TG MSG" if video else "❌ No Asset")
    
    print(f"Lec #{lec['id']} | {lec['title'][:35]} | Audio: {audio_status} | Video: {video_status}")
