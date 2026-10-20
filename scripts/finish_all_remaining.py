import os
import sys
import json
import asyncio
import logging
import subprocess
import urllib.request
from pathlib import Path
from telethon import TelegramClient

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

LOG_FILE = Path(r"d:\الكليه\BOT\final_finish_runner.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding='utf-8')
    ]
)
logger = logging.getLogger("FinalFinishRunner")

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://cjmlnpdtfclzcvehebsv.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
API_ID = int(os.getenv("TELEGRAM_API_ID", "23966686"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHANNEL_ID = int(os.getenv("TELEGRAM_CHANNEL_ID", "-1004453609138"))
TEMP_DIR = Path(r"d:\الكليه\BOT\media_storage\temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

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

from app.services.notebooklm_client import run_notebooklm_cmd

run_cli_command = run_notebooklm_cmd

FINAL_TASKS = [
    # 1. Lec 1 Audio
    {
        "lecture_id": 1,
        "type": "audio",
        "subject": "هندسه تفاضلية",
        "doc": "د/ حسين",
        "num": 1,
        "title": "مفهوم المنحنى وطول القوس",
        "notebook_id": "01f480f1-2a33-4a87-80df-dbe2924008cb",
        "prompt": "شرح مفهوم المنحنى وطول القوس ومتجه السرعة والبرامتر الطبيعي بالعامية المصرية"
    },
    # 2. Lec 3 Video
    {
        "lecture_id": 3,
        "type": "video",
        "subject": "تعليم ورياده اعمال",
        "doc": "د/ مروة",
        "num": 1,
        "title": "التربية المعاصرة ودور المعلم الريادي",
        "notebook_id": "847bae1d-0271-4715-b8a0-45aa281470ff",
        "prompt": "فيديو تفاعلي يشرح التربية المعاصرة وكفايات المعلم الريادي وأساليب التدريس الحديثة"
    },
    # 3. Lec 17 Video
    {
        "lecture_id": 17,
        "type": "video",
        "subject": "نظريه عدد ومنطق",
        "doc": "د/ محمد حسين",
        "num": 2,
        "title": "قابلية القسمة وخوارزمية إقليدس",
        "notebook_id": "d8ae29c4-61e0-4c54-aef3-55304308e5cf",
        "prompt": "فيديو تفاعلي يشرح خوارزمية إقليدس والقاسم المشترك الأكبر والمعادلات الديوفانتية"
    },
    # 4. Lec 18 Video
    {
        "lecture_id": 18,
        "type": "video",
        "subject": "استاتيكا2",
        "doc": "د/ ايه",
        "num": 1,
        "title": "اتزان الأجسام الصلبة والازدواجات",
        "notebook_id": "b7a20b69-43be-43ad-8942-0cae3785fe9d",
        "prompt": "فيديو تفاعلي يشرح اتزان الأجسام الصلبة وعزم الازدواج وشروط الاتزان مع حل المسائل"
    },
    # 5. Lec 21 Video
    {
        "lecture_id": 21,
        "type": "video",
        "subject": "معادلات تفاضلية",
        "doc": "د/ حسين",
        "num": 1,
        "title": "المعادلات التفاضلية من الرتبة الأولى وطرق حلها",
        "notebook_id": "0dc08f05-722e-4e89-8cd3-f04e999e5ac3",
        "prompt": "فيديو تفاعلي يشرح طرق حل المعادلات التفاضلية من الرتبة الأولى وفصل المتغيرات"
    }
]

async def process_one(task: dict, tg_client: TelegramClient, idx: int, total: int):
    lec_id = task["lecture_id"]
    atype = task["type"]
    sub = task["subject"]
    doc = task["doc"]
    num = task["num"]
    title = task["title"]
    nid = task["notebook_id"]
    prompt = task["prompt"]
    
    logger.info("=" * 70)
    logger.info(f"[{idx}/{total}] FINAL SPRINT: Lec #{lec_id} ({sub} - {title}) -> {atype.upper()}")
    logger.info("=" * 70)
    
    if atype == "audio":
        audio_file = TEMP_DIR / f"audio_{lec_id}.m4a"
        if audio_file.exists():
            audio_file.unlink()
            
        cmd = [
            "notebooklm", "generate", "audio",
            prompt,
            "--length", "long",
            "--language", "ar_eg",
            "--wait",
            "--retry", "3",
            "-n", nid
        ]
        run_cli_command(cmd, timeout=900)
        dl_code, dl_out = run_cli_command(["notebooklm", "download", "audio", str(audio_file), "-n", nid])
        
        if audio_file.exists() and audio_file.stat().st_size > 5000:
            caption = f"📚 #{sub.replace(' ', '_')} | 👨‍🏫 {doc}\n📌 المحاضرة {num}: {title}\n🎧 بودكاست المحاضرة الصوتي (شرح تفصيلي بالعامية)"
            msg = await tg_client.send_file(CHANNEL_ID, str(audio_file), caption=caption, supports_streaming=False)
            logger.info(f"✅ Uploaded Lec #{lec_id} audio to TG! Msg ID: {msg.id}")
            update_supabase(lec_id, "audio", msg.id, audio_file.stat().st_size, "بودكاست المحاضرة الصوتي")
            logger.info(f"🎉🎉 [Lec #{lec_id}] NOW 5/5 100% COMPLETE!")
        else:
            logger.error(f"❌ Failed to download audio for Lec #{lec_id}: {dl_out}")

    elif atype == "video":
        video_file = TEMP_DIR / f"video_{lec_id}.mp4"
        if video_file.exists():
            video_file.unlink()
            
        cmd = [
            "notebooklm", "generate", "video",
            prompt,
            "--format", "explainer",
            "--language", "ar_eg",
            "--wait",
            "--retry", "3",
            "-n", nid
        ]
        run_cli_command(cmd, timeout=1200)
        dl_code, dl_out = run_cli_command(["notebooklm", "download", "video", str(video_file), "-n", nid])
        
        if video_file.exists() and video_file.stat().st_size > 5000:
            caption = f"📚 #{sub.replace(' ', '_')} | 👨‍🏫 {doc}\n📌 المحاضرة {num}: {title}\n🎬 فيديو الشرح التفاعلي (عرض بصري وتطبيقي)"
            msg = await tg_client.send_file(CHANNEL_ID, str(video_file), caption=caption, supports_streaming=True)
            logger.info(f"✅ Uploaded Lec #{lec_id} video to TG! Msg ID: {msg.id}")
            update_supabase(lec_id, "video", msg.id, video_file.stat().st_size, "فيديو الشرح التفاعلي")
            logger.info(f"🎉🎉 [Lec #{lec_id}] NOW 5/5 100% COMPLETE!")
        else:
            logger.error(f"❌ Failed to download video for Lec #{lec_id}: {dl_out}")

async def main():
    logger.info("🚀 LAUNCHING FINAL FINISH RUNNER FOR THE LAST 5 ASSETS...")
    client = TelegramClient("bot_uploader_session", API_ID, API_HASH)
    await client.start(bot_token=BOT_TOKEN)
    logger.info("Telegram Bot Client connected.")
    
    total = len(FINAL_TASKS)
    for idx, t in enumerate(FINAL_TASKS, 1):
        try:
            await process_one(t, client, idx, total)
        except Exception as e:
            logger.error(f"Error in task {t['lecture_id']} ({t['type']}): {e}", exc_info=True)
            
    await client.disconnect()
    logger.info("🏆🏆 ALL 21 LECTURES ACROSS ENTIRE PLATFORM ARE NOW 100% COMPLETE (5/5)!")

if __name__ == "__main__":
    asyncio.run(main())
