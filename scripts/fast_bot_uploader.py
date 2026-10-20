import os
import sys
import json
import asyncio
import logging
import urllib.request
from pathlib import Path
from telethon import TelegramClient

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("FastBotUploader")

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://cjmlnpdtfclzcvehebsv.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
API_ID = int(os.getenv("TELEGRAM_API_ID", "23966686"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHANNEL_ID = int(os.getenv("TELEGRAM_CHANNEL_ID", "-1004453609138"))
TEMP_DIR = Path(r"d:\الكليه\BOT\media_storage\temp")

def supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

def update_supabase(lecture_id: int, asset_type: str, tg_msg_id: int, file_size: int, title: str):
    headers = supabase_headers()
    url = f"{SUPABASE_URL}/rest/v1/media_assets?lecture_id=eq.{lecture_id}&asset_type=eq.{asset_type}"
    req = urllib.request.Request(url, headers=headers)
    existing = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    
    payload = {
        "telegram_message_id": tg_msg_id,
        "file_size_bytes": file_size,
        "title": title
    }
    
    if existing:
        asset_id = existing[0]['id']
        patch_url = f"{SUPABASE_URL}/rest/v1/media_assets?id=eq.{asset_id}"
        patch_req = urllib.request.Request(patch_url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='PATCH')
        urllib.request.urlopen(patch_req)
        logger.info(f"✅ [Supabase] Updated MediaAsset #{asset_id} (Lec {lecture_id}, {asset_type}) -> TG #{tg_msg_id}")
    else:
        payload["lecture_id"] = lecture_id
        payload["asset_type"] = asset_type
        post_url = f"{SUPABASE_URL}/rest/v1/media_assets"
        post_req = urllib.request.Request(post_url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        urllib.request.urlopen(post_req)
        logger.info(f"✅ [Supabase] Created MediaAsset (Lec {lecture_id}, {asset_type}) -> TG #{tg_msg_id}")

READY_UPLOADS = [
    # Lec 11 Audio was already uploaded with message ID 167! We register it directly.
    {
        "lecture_id": 11,
        "asset_type": "audio",
        "file_path": TEMP_DIR / "audio_11.m4a",
        "title": "بودكاست المحاضرة الصوتي",
        "caption": "📚 #فلسفه_وتاريخ_رياضيات | 👨‍🏫 د/ طه ابراهيم\n📌 المحاضرة 3: الحساب والعمليات الرياضية في الحضارة المصرية\n🎧 بودكاست المحاضرة الصوتي",
        "pre_msg_id": 167
    },
    # Lec 10 Video
    {
        "lecture_id": 10,
        "asset_type": "video",
        "file_path": TEMP_DIR / "video_10.mp4",
        "title": "فيديو الشرح التفاعلي",
        "caption": "📚 #فلسفه_وتاريخ_رياضيات | 👨‍🏫 د/ طه ابراهيم\n📌 المحاضرة 2: تاريخ الرياضيات وأنظمة العد القديمة\n🎬 فيديو الشرح التفاعلي (عرض بصري وتطبيقي)"
    },
    # Lec 20 Video
    {
        "lecture_id": 20,
        "asset_type": "video",
        "file_path": TEMP_DIR / "video_20.mp4",
        "title": "فيديو الشرح التفاعلي",
        "caption": "📚 #كهربيه_مغناطيسية_وتيار_متردد | 👨‍🏫 د/ حسن سيد\n📌 المحاضرة 1: قانون كولوم والمجال الكهربي\n🎬 فيديو الشرح التفاعلي (عرض بصري وتطبيقي)"
    },
    # Lec 1 Video
    {
        "lecture_id": 1,
        "asset_type": "video",
        "file_path": TEMP_DIR / "video_1.mp4",
        "title": "فيديو الشرح التفاعلي",
        "caption": "📚 #هندسه_تفاضلية | 👨‍🏫 د/ حسين\n📌 المحاضرة 1: مفهوم المنحنى وطول القوس\n🎬 فيديو الشرح التفاعلي (عرض بصري وتطبيقي)"
    },
    # Lec 3 Audio
    {
        "lecture_id": 3,
        "asset_type": "audio",
        "file_path": TEMP_DIR / "audio_3.m4a",
        "title": "بودكاست المحاضرة الصوتي",
        "caption": "📚 #تعليم_ورياده_اعمال | 👨‍🏫 د/ مروة\n📌 المحاضرة 1: التربية المعاصرة ودور المعلم الريادي\n🎧 بودكاست المحاضرة الصوتي"
    },
    # Lec 17 Audio
    {
        "lecture_id": 17,
        "asset_type": "audio",
        "file_path": TEMP_DIR / "audio_17.m4a",
        "title": "بودكاست المحاضرة الصوتي",
        "caption": "📚 #نظريه_عدد_ومنطق | 👨‍🏫 د/ محمد حسين\n📌 المحاضرة 2: قابلية القسمة وخوارزمية إقليدس\n🎧 بودكاست المحاضرة الصوتي"
    },
    # Lec 18 Audio
    {
        "lecture_id": 18,
        "asset_type": "audio",
        "file_path": TEMP_DIR / "audio_18.m4a",
        "title": "بودكاست المحاضرة الصوتي",
        "caption": "📚 #استاتيكا2 | 👨‍🏫 د/ ايه\n📌 المحاضرة 1: اتزان الأجسام الصلبة والازدواجات\n🎧 بودكاست المحاضرة الصوتي"
    },
    # Lec 21 Audio
    {
        "lecture_id": 21,
        "asset_type": "audio",
        "file_path": TEMP_DIR / "audio_21.m4a",
        "title": "بودكاست المحاضرة الصوتي",
        "caption": "📚 #معادلات_تفاضلية | 👨‍🏫 د/ حسين\n📌 المحاضرة 1: المعادلات التفاضلية من الرتبة الأولى وطرق حلها\n🎧 بودكاست المحاضرة الصوتي"
    }
]

async def main():
    client = TelegramClient("bot_uploader_session", API_ID, API_HASH)
    await client.start(bot_token=BOT_TOKEN)
    logger.info("Connected to Telegram via Bot MTProto Session.")

    for item in READY_UPLOADS:
        lec_id = item["lecture_id"]
        atype = item["asset_type"]
        path = item["file_path"]
        title = item["title"]
        caption = item["caption"]
        
        if item.get("pre_msg_id"):
            msg_id = item["pre_msg_id"]
            fsize = path.stat().st_size if path.exists() else 0
            update_supabase(lec_id, atype, msg_id, fsize, title)
            continue
            
        if not path.exists():
            logger.warning(f"File {path} does not exist, skipping.")
            continue
            
        fsize = path.stat().st_size
        size_mb = round(fsize / (1024 * 1024), 2)
        logger.info(f"Uploading Lec #{lec_id} {atype}: {path.name} ({size_mb} MB)...")
        
        msg = await client.send_file(
            CHANNEL_ID,
            str(path),
            caption=caption,
            supports_streaming=(atype == "video")
        )
        logger.info(f"✅ Uploaded to TG! Msg ID: {msg.id}")
        update_supabase(lec_id, atype, msg.id, fsize, title)
        
    await client.disconnect()
    logger.info("🏁 All ready files uploaded and linked to Supabase!")

if __name__ == "__main__":
    asyncio.run(main())
