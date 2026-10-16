import os
import sys
import json
import asyncio
import logging
import subprocess
import urllib.request
from pathlib import Path
from telethon import TelegramClient
from telethon.sessions import StringSession

# Set UTF-8
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

LOG_FILE = Path(r"d:\الكليه\BOT\missing_media_runner.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding='utf-8')
    ]
)
logger = logging.getLogger("MissingMediaRunner")

# Configuration
SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbWxucGR0ZmNsemN2ZWhlYnN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTgyNTIwMiwiZXhwIjoyMTA3NDAxMjAyfQ.GSyJX2iMGJgT2b7lmCoBO1g1zLFQbGve4ttWjt8Lkaw'
API_ID = 23966686
API_HASH = "0ba67a50ec826a4bbb5eb6a80c369bfc"
CHANNEL_ID = -1004453609138
SESSION_STR = "1BJWap1wBu67_sQPEvGKlkbPdSoKebLWw2LSx3aqpvEuFlg6W2YM_FBMECbwKoBeZvmOfHmb2IrgRX8zUdAJGL--3JlV8EsyAmwl_q0PAt3V9pafsX350j8q0FXXUJIp3_yH8MerFnG0fP0d-Lt65D6F9yP_G1p84WPXZRibOTEH2KU5aER9ZzKC9_MtIQF5ZuSDzVDvN_uuBcyXtFgZ2jK5ejEE7qbGMIqSiyEz6qyyLP4UFwppqqtJHXmBavSN6xJpweXF5xBPVIXtXtmrKgv0w8ib2deiZS3vcJ6WIXhZvAUztDcewzTevqD0XpeM1KeStLkON4sVFWgx-Xz3k10qnjCSa5GY="

TEMP_DIR = Path(r"d:\الكليه\BOT\media_storage\temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Supabase REST Helper
def supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

def update_supabase_asset(lecture_id: int, asset_type: str, tg_msg_id: int, file_size: int, title: str):
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
        logger.info(f"✅ [Supabase] Updated existing MediaAsset #{asset_id} (Lec {lecture_id}, {asset_type}) -> TG Msg #{tg_msg_id}")
    else:
        payload["lecture_id"] = lecture_id
        payload["asset_type"] = asset_type
        post_url = f"{SUPABASE_URL}/rest/v1/media_assets"
        post_req = urllib.request.Request(post_url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        urllib.request.urlopen(post_req)
        logger.info(f"✅ [Supabase] Created new MediaAsset (Lec {lecture_id}, {asset_type}) -> TG Msg #{tg_msg_id}")

def update_lecture_notebook(lecture_id: int, notebook_id: str):
    headers = supabase_headers()
    patch_url = f"{SUPABASE_URL}/rest/v1/lectures?id=eq.{lecture_id}"
    payload = {"notebook_id": notebook_id}
    patch_req = urllib.request.Request(patch_url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='PATCH')
    urllib.request.urlopen(patch_req)
    logger.info(f"✅ [Supabase] Set notebook_id={notebook_id} for Lecture #{lecture_id}")

# Run CLI with auto-reauth
from app.services.notebooklm_client import run_notebooklm_cmd

run_cli_command = run_notebooklm_cmd

def get_artifacts(nid: str) -> list[dict]:
    code, out = run_cli_command(["notebooklm", "artifact", "list", "-n", nid, "--json"])
    if code == 0:
        try:
            data = json.loads(out)
            return data if isinstance(data, list) else data.get("artifacts", [])
        except Exception:
            pass
    return []

# Telegram Uploader
async def upload_file_to_telegram(tg_client, file_path: Path, caption: str, is_video: bool = False) -> int:
    size_mb = round(os.path.getsize(file_path) / (1024 * 1024), 2)
    logger.info(f"Uploading {file_path.name} ({size_mb} MB) to Telegram Channel...")
    
    msg = await tg_client.send_file(
        CHANNEL_ID,
        str(file_path),
        caption=caption,
        supports_streaming=is_video
    )
    logger.info(f"✅ Telegram Upload Success! Message ID: {msg.id}")
    return msg.id

# Pipeline Tasks Definition
TASKS = [
    # Quick wins (only 1 asset missing)
    {
        "lecture_id": 4,
        "subject": "تعليم ورياده اعمال",
        "doc": "د/ وليد",
        "num": 1,
        "title": "أساسيات ريادة الأعمال وإدارة المشروعات",
        "notebook_id": "08874d7b-c389-4a74-9960-8f0a94d8fbe5",
        "missing": ["audio"],
        "prompt": "اشرح أساسيات ريادة الأعمال وإدارة المشروعات باللهجة المصرية بالتفصيل"
    },
    {
        "lecture_id": 8,
        "subject": "هندسه تفاضلية",
        "doc": "د/ حسين",
        "num": 4,
        "title": "الانحناء والالتواء للبارامتر العام",
        "notebook_id": "317432b4-17e8-425d-bd5f-7a36b77c1cb6",
        "missing": ["video"],
        "prompt": "فيديو تعليمي تفاعلي يشرح قوانين الانحناء والالتواء وصيغ فرينيه بالعامية المصرية"
    },
    {
        "lecture_id": 10,
        "subject": "فلسفه وتاريخ رياضيات",
        "doc": "د/ طه ابراهيم",
        "num": 2,
        "title": "تاريخ الرياضيات وأنظمة العد القديمة",
        "notebook_id": "39eb27b3-63a2-4610-b17c-b45598a94ed5",
        "missing": ["video"],
        "prompt": "فيديو تفاعلي يشرح أنظمة العد البابلية والمصرية والإغريقية بالعامية المصرية"
    },
    {
        "lecture_id": 11,
        "subject": "فلسفه وتاريخ رياضيات",
        "doc": "د/ طه ابراهيم",
        "num": 3,
        "title": "الحساب والعمليات الرياضية في الحضارة المصرية القديمة",
        "notebook_id": "eda89137-c466-4878-a9b7-5734817a6da0",
        "missing": ["audio"],
        "prompt": "اشرح طرق الضرب والجمع والكسور المصرية القديمة باللهجة المصرية بالتفصيل"
    },
    {
        "lecture_id": 20,
        "subject": "كهربيه مغناطيسية وتيار متردد",
        "doc": "د/ حسن سيد",
        "num": 1,
        "title": "قانون كولوم والمجال الكهربي",
        "notebook_id": "8a201dde-a2d1-4fe1-8c92-5ae268997e30",
        "missing": ["video"],
        "prompt": "فيديو تعليمي تفاعلي يشرح قانون كولوم وحساب شدة المجال الكهربي وخطوط المجال"
    },
    # Dual missing lectures
    {
        "lecture_id": 3,
        "subject": "تعليم ورياده اعمال",
        "doc": "د/ مروة",
        "num": 1,
        "title": "التربية المعاصرة ودور المعلم الريادي",
        "notebook_id": "847bae1d-0271-4715-b8a0-45aa281470ff",
        "missing": ["audio", "video"],
        "prompt": "التربية المعاصرة وكفايات المعلم الريادي وأساليب التدريس الحديثة"
    },
    {
        "lecture_id": 17,
        "subject": "نظريه عدد ومنطق",
        "doc": "د/ محمد حسين",
        "num": 2,
        "title": "قابلية القسمة وخوارزمية إقليدس",
        "notebook_id": "d8ae29c4-61e0-4c54-aef3-55304308e5cf",
        "missing": ["audio", "video"],
        "prompt": "شرح خوارزمية إقليدس والقاسم المشترك الأكبر والمعادلات الديوفانتية بالعامية المصرية"
    },
    {
        "lecture_id": 18,
        "subject": "استاتيكا2",
        "doc": "د/ ايه",
        "num": 1,
        "title": "اتزان الأجسام الصلبة والازدواجات",
        "notebook_id": "b7a20b69-43be-43ad-8942-0cae3785fe9d",
        "missing": ["audio", "video"],
        "prompt": "شرح اتزان الأجسام الصلبة وعزم الازدواج وشروط الاتزان مع حل المسائل بالعامية المصرية"
    },
    {
        "lecture_id": 21,
        "subject": "معادلات تفاضلية",
        "doc": "د/ حسين",
        "num": 1,
        "title": "المعادلات التفاضلية من الرتبة الأولى وطرق حلها",
        "notebook_id": "0dc08f05-722e-4e89-8cd3-f04e999e5ac3",
        "missing": ["audio", "video"],
        "prompt": "شرح طرق حل المعادلات التفاضلية من الرتبة الأولى وفصل المتغيرات بالعامية المصرية"
    },
    {
        "lecture_id": 1,
        "subject": "هندسه تفاضلية",
        "doc": "د/ حسين",
        "num": 1,
        "title": "مفهوم المنحنى وطول القوس",
        "notebook_id": None, # Will be created
        "pdf_path": Path(r"d:\الكليه\subjects\هندسه تفاضلية\lec1\lec1.pdf"),
        "missing": ["audio", "video"],
        "prompt": "شرح مفهوم المنحنى وطول القوس ومتجه السرعة والبرامتر الطبيعي بالعامية المصرية"
    }
]

async def process_task(task: dict, tg_client: TelegramClient, idx: int, total: int):
    lec_id = task["lecture_id"]
    title = task["title"]
    sub = task["subject"]
    doc = task["doc"]
    num = task["num"]
    nid = task.get("notebook_id")
    prompt = task.get("prompt", "اشرح المحاضرة بالتفصيل")
    
    logger.info("=" * 70)
    logger.info(f"[{idx}/{total}] STARTING LECTURE #{lec_id}: {sub} - {title}")
    logger.info("=" * 70)
    
    # 1. Ensure notebook exists
    if not nid:
        logger.info(f"Creating Notebook for Lec #{lec_id}...")
        nb_title = f"{sub} ({doc}) - المحاضرة {num}: {title}"
        c_code, c_out = run_cli_command(["notebooklm", "create", nb_title, "-u", "--json"])
        if c_code == 0:
            try:
                data = json.loads(c_out)
                nid = data.get("id") or data.get("notebook_id") or data.get("notebook", {}).get("id")
            except Exception:
                pass
        if not nid:
            import re
            m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", c_out)
            if m:
                nid = m.group(1)
        
        if not nid:
            logger.error(f"❌ Failed to create notebook for Lec #{lec_id}: {c_out}")
            return
            
        logger.info(f"✅ Created Notebook ID: {nid}")
        task["notebook_id"] = nid
        update_lecture_notebook(lec_id, nid)
        
        # Add PDF
        pdf_path = task.get("pdf_path")
        if pdf_path and pdf_path.exists():
            logger.info(f"Adding source PDF {pdf_path} to notebook {nid}...")
            run_cli_command(["notebooklm", "source", "add", str(pdf_path), "-n", nid])
            
    # Check current artifacts in this notebook
    artifacts = get_artifacts(nid)

    # Process Missing Audio
    if "audio" in task["missing"]:
        logger.info(f"--- [Lec #{lec_id}] Checking / Generating Audio Overview ---")
        audio_art = next((a for a in artifacts if a.get("type") == "audio" and a.get("status") in ("completed", "in_progress")), None)
        
        if audio_art and audio_art.get("status") == "in_progress":
            logger.info(f"Audio generation already in progress (ID: {audio_art['id']}), waiting...")
            run_cli_command(["notebooklm", "artifact", "wait", audio_art["id"], "-n", nid, "--timeout", "900"])
        elif not (audio_art and audio_art.get("status") == "completed"):
            logger.info(f"Launching fresh Audio generation with ar_eg...")
            audio_cmd = [
                "notebooklm", "generate", "audio",
                prompt,
                "--length", "long",
                "--language", "ar_eg",
                "--wait",
                "--retry", "3",
                "-n", nid
            ]
            run_cli_command(audio_cmd, timeout=900)
            
        # Download audio
        audio_file = TEMP_DIR / f"audio_{lec_id}.m4a"
        if audio_file.exists():
            audio_file.unlink()
            
        dl_code, dl_out = run_cli_command(["notebooklm", "download", "audio", str(audio_file), "-n", nid])
        if audio_file.exists() and audio_file.stat().st_size > 5000:
            caption = f"📚 #{sub.replace(' ', '_')} | 👨‍🏫 {doc}\n📌 المحاضرة {num}: {title}\n🎧 بودكاست المحاضرة الصوتي (شرح تفصيلي بالعامية)"
            msg_id = await upload_file_to_telegram(tg_client, audio_file, caption, is_video=False)
            update_supabase_asset(lec_id, "audio", msg_id, audio_file.stat().st_size, "بودكاست المحاضرة الصوتي")
            logger.info(f"🎉 [Lec #{lec_id}] Audio 100% COMPLETE & LIVE!")
        else:
            logger.error(f"❌ [Lec #{lec_id}] Failed to download audio: {dl_out}")

    # Re-fetch artifacts
    artifacts = get_artifacts(nid)

    # Process Missing Video
    if "video" in task["missing"]:
        logger.info(f"--- [Lec #{lec_id}] Checking / Generating Video Overview ---")
        video_art = next((a for a in artifacts if a.get("type") == "video" and a.get("status") in ("completed", "in_progress")), None)
        
        if video_art and video_art.get("status") == "in_progress":
            logger.info(f"Video generation already in progress (ID: {video_art['id']}), waiting...")
            run_cli_command(["notebooklm", "artifact", "wait", video_art["id"], "-n", nid, "--timeout", "1200"])
        elif not (video_art and video_art.get("status") == "completed"):
            logger.info(f"Launching fresh Video generation with ar_eg...")
            video_cmd = [
                "notebooklm", "generate", "video",
                prompt,
                "--format", "explainer",
                "--language", "ar_eg",
                "--wait",
                "--retry", "3",
                "-n", nid
            ]
            run_cli_command(video_cmd, timeout=1200)
            
        # Download video
        video_file = TEMP_DIR / f"video_{lec_id}.mp4"
        if video_file.exists():
            video_file.unlink()
            
        dl_code, dl_out = run_cli_command(["notebooklm", "download", "video", str(video_file), "-n", nid])
        if video_file.exists() and video_file.stat().st_size > 5000:
            caption = f"📚 #{sub.replace(' ', '_')} | 👨‍🏫 {doc}\n📌 المحاضرة {num}: {title}\n🎬 فيديو الشرح التفاعلي (عرض بصري وتطبيقي)"
            msg_id = await upload_file_to_telegram(tg_client, video_file, caption, is_video=True)
            update_supabase_asset(lec_id, "video", msg_id, video_file.stat().st_size, "فيديو الشرح التفاعلي")
            logger.info(f"🎉 [Lec #{lec_id}] Video 100% COMPLETE & LIVE!")
        else:
            logger.error(f"❌ [Lec #{lec_id}] Failed to download video: {dl_out}")

async def main():
    logger.info("🚀 INITIALIZING ENHANCED MISSING MEDIA GENERATION BATCH RUNNER...")
    client = TelegramClient(StringSession(SESSION_STR), API_ID, API_HASH)
    await client.connect()
    logger.info("Connected to Telegram MTProto Client.")
    
    total = len(TASKS)
    for idx, task in enumerate(TASKS, 1):
        try:
            await process_task(task, client, idx, total)
        except Exception as e:
            logger.error(f"Error processing task {task['lecture_id']}: {e}", exc_info=True)
            
    await client.disconnect()
    logger.info("🏁 ALL TASKS FINISHED! Check audit_media_assets.py for final matrix.")

if __name__ == "__main__":
    asyncio.run(main())
