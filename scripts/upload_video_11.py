import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.stdout.reconfigure(encoding='utf-8')
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession
from app.config import settings
import urllib.request
import json

SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbWxucGR0ZmNsemN2ZWhlYnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjUyMDIsImV4cCI6MjEwNzQwMTIwMn0.NipIyq1IfvcjXiI9iL4KjIq-B-OK60AI0guQZz5PB8k'

async def main():
    video_path = r"D:\الكليه\BOT\media_storage\video\video_11.mp4"
    if not os.path.exists(video_path):
        print("File does not exist:", video_path)
        return
        
    print(f"Uploading {video_path} ({round(os.path.getsize(video_path)/1024/1024, 2)} MB) to Telegram...")
    client = TelegramClient(StringSession(settings.TELETHON_SESSION_STRING), settings.TELEGRAM_API_ID, settings.TELEGRAM_API_HASH)
    await client.connect()
    channel_id = int(settings.TELEGRAM_CHANNEL_ID)
    
    caption = "📚 #فلسفه_وتاريخ_رياضيات | 👨‍🏫 د/ طه ابراهيم 📌 المحاضرة 3: الحساب والعمليات الرياضية في الحضارة المصرية 🎬 فيديو الشرح التفاعلي"
    
    msg = await client.send_file(
        channel_id,
        video_path,
        caption=caption,
        supports_streaming=True
    )
    print(f"✅ Uploaded to Telegram! Message ID: {msg.id}")
    await client.disconnect()
    
    # Update Supabase asset for lecture 11
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    # Check existing video asset for lecture 11
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/media_assets?lecture_id=eq.11&asset_type=eq.video", headers=headers)
    assets = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    
    payload = {
        "telegram_message_id": msg.id,
        "file_size_bytes": os.path.getsize(video_path),
        "title": "فيديو الشرح التفاعلي"
    }
    
    if assets:
        asset_id = assets[0]['id']
        patch_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/media_assets?id=eq.{asset_id}",
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='PATCH'
        )
        urllib.request.urlopen(patch_req)
        print(f"✅ Updated existing Supabase MediaAsset #{asset_id} with TG Msg #{msg.id}")
    else:
        payload["lecture_id"] = 11
        payload["asset_type"] = "video"
        post_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/media_assets",
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        urllib.request.urlopen(post_req)
        print(f"✅ Created new Supabase MediaAsset for lecture 11 with TG Msg #{msg.id}")

if __name__ == "__main__":
    asyncio.run(main())
