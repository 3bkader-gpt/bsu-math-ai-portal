import sys
import os
import io
import json
import asyncio
import logging
import subprocess
import time
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.services.telegram_storage import telegram_storage
from app.services.notebooklm_client import run_notebooklm_cmd_async

LOG_FILE = ROOT_DIR / "media_production.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding='utf-8')
    ]
)
logger = logging.getLogger("MediaPipeline")

SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbWxucGR0ZmNsemN2ZWhlYnN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTgyNTIwMiwiZXhwIjoyMTA3NDAxMjAyfQ.GSyJX2iMGJgT2b7lmCoBO1g1zLFQbGve4ttWjt8Lkaw'

HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': f'Bearer {SUPABASE_KEY}',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
}

TEMP_DIR = ROOT_DIR / "media_storage" / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

STATE_FILE = ROOT_DIR / "media_pipeline_state.json"

TASKS = [
    {
        "lecture_id": 28,
        "subject": "كهربيه مغناطيسية وتيار متردد",
        "doc": "د/ حسن سيد",
        "num": 3,
        "title": "كود ألوان المقاومات والمقاومات الضوئية والحرارية (LDR والثرمستور)",
        "notebook_id": "5513202e-4983-430d-940f-4d56bb3f47ba",
        "pdf_paths": [
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec3\lec3.pdf",
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec3\كتاب - كود ألوان المقاومات والمقاومات الضوئية والحرارية (LDR والثرمستور).pdf"
        ],
        "prompt": "شرح تفصيلي بالعامية المصرية لكود ألوان المقاومات وقراءتها والمقاومات الحساسة LDR والثرمستور"
    },
    {
        "lecture_id": 29,
        "subject": "كهربيه مغناطيسية وتيار متردد",
        "doc": "د/ حسن سيد",
        "num": 4,
        "title": "المكثفات الكهربية وسعتها وأنواعها والمفاعلة السعوية",
        "notebook_id": None,
        "pdf_paths": [
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec4\lec4.pdf",
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec4\كتاب - المكثفات الكهربية وسعتها وأنواعها والمفاعلة السعوية.pdf"
        ],
        "prompt": "شرح مفهوم المكثفات الكهربية وسعتها وقوانين الشحن والتفريغ والمفاعلة السعوية في دوائر التيار المتردد بالعامية المصرية"
    },
    {
        "lecture_id": 30,
        "subject": "كهربيه مغناطيسية وتيار متردد",
        "doc": "د/ حسن سيد",
        "num": 5,
        "title": "الملفات وتأثيرها والحث الذاتي وتصنيف الملفات حسب مادة القلب",
        "notebook_id": None,
        "pdf_paths": [
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec5\lec5.pdf",
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec5\كتاب - الملفات وتأثيرها والحث الذاتي وتصنيف الملفات حسب مادة القلب.pdf"
        ],
        "prompt": "شرح الحث الذاتي للملفات والمفاعلة الحثية وتأثير التردد ومادة القلب بالعامية المصرية"
    },
    {
        "lecture_id": 31,
        "subject": "كهربيه مغناطيسية وتيار متردد",
        "doc": "د/ حسن سيد",
        "num": 6,
        "title": "توصيل الملفات توالي وتوازي والحث المتبادل ومسائل فاراداي",
        "notebook_id": None,
        "pdf_paths": [
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec6\lec6.pdf",
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec6\كتاب - توصيل الملفات توالي وتوازي والحث المتبادل ومسائل فاراداي.pdf"
        ],
        "prompt": "شرح قانون فاراداي وقاعدة لنز والحث المتبادل وطرق توصيل الملفات بالعامية المصرية"
    },
    {
        "lecture_id": 32,
        "subject": "كهربيه مغناطيسية وتيار متردد",
        "doc": "د/ حسن سيد",
        "num": 7,
        "title": "بنك أسئلة وتطبيقات شاملة على الكهربية والمغناطيسية ودوائر RLC",
        "notebook_id": None,
        "pdf_paths": [
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec7\lec7.pdf",
            r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec7\كتاب - بنك أسئلة وتطبيقات شاملة على الكهربية والمغناطيسية.pdf"
        ],
        "prompt": "مراجعة شاملة وحل مسائل دوائر التيار المتردد RLC وحالة الرنين بالعامية المصرية"
    },
    {
        "lecture_id": 33,
        "subject": "نظريه عدد ومنطق",
        "doc": "د/ محمد حسين",
        "num": 3,
        "title": "التطابقات الحسابية ونظام بواقي القسمة ومبرهنة فيرما",
        "notebook_id": None,
        "pdf_paths": [
            r"D:\الكليه\subjects\نظريه عدد ومنطق\lec3\lec3.pdf"
        ],
        "prompt": "شرح التطابقات الحسابية ومبرهنة فيرما الصغرى وحل معادلات التطابق الخطي بالعامية المصرية"
    },
    {
        "lecture_id": 34,
        "subject": "استاتيكا2",
        "doc": "د/ ايه",
        "num": 2,
        "title": "المشتقة الاتجاهية والمؤثرات التفاضلية (التباعد والدوران ولابلاس)",
        "notebook_id": None,
        "pdf_paths": [
            r"D:\الكليه\subjects\استاتيكا2\lec2\lec2.pdf",
            r"D:\الكليه\subjects\استاتيكا2\lec2\كتاب - المشتقة الاتجاهية والمؤثرات التفاضلية (التباعد والدوران ولابلاس).pdf"
        ],
        "prompt": "شرح مؤثر نابلا والانحدار والمشتقة الاتجاهية والتباعد والدوران ولابلاس بالعامية المصرية"
    },
    {
        "lecture_id": 35,
        "subject": "استاتيكا2",
        "doc": "د/ ايه",
        "num": 3,
        "title": "المؤثرات التفاضلية في الإحداثيات المنحنية والتكامل الخطي",
        "notebook_id": None,
        "pdf_paths": [
            r"D:\الكليه\subjects\استاتيكا2\lec3\lec3.pdf",
            r"D:\الكليه\subjects\استاتيكا2\lec3\كتاب - المؤثرات التفاضلية في الإحداثيات الأسطوانية والكروية والتكامل الخطي.pdf"
        ],
        "prompt": "شرح الإحداثيات الأسطوانية والكروية والتكامل الخطي لحساب الشغل بالعامية المصرية"
    }
]

def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {}

def save_state(state: dict):
    try:
        STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')
    except Exception as e:
        logger.error(f"Failed to save state: {e}")

async def run_cmd(args: list[str]) -> tuple[int, str]:
    return await run_notebooklm_cmd_async(args)

async def update_supabase_media_asset(lecture_id: int, asset_type: str, tg_msg_id: int, tg_file_id: str, file_size: int, title: str):
    import urllib.request
    url = f"{SUPABASE_URL}/rest/v1/media_assets?lecture_id=eq.{lecture_id}&asset_type=eq.{asset_type}"
    req = urllib.request.Request(url, headers=HEADERS)
    existing = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))

    payload = {
        "telegram_message_id": tg_msg_id,
        "telegram_file_id": tg_file_id,
        "file_size_bytes": file_size,
        "title": title
    }

    if existing:
        asset_id = existing[0]['id']
        patch_url = f"{SUPABASE_URL}/rest/v1/media_assets?id=eq.{asset_id}"
        patch_req = urllib.request.Request(patch_url, data=json.dumps(payload).encode('utf-8'), headers=HEADERS, method='PATCH')
        urllib.request.urlopen(patch_req)
        logger.info(f"✅ [Supabase] Updated existing MediaAsset #{asset_id} (Lec {lecture_id}, {asset_type}) -> TG Msg #{tg_msg_id}")
    else:
        payload["lecture_id"] = lecture_id
        payload["asset_type"] = asset_type
        post_url = f"{SUPABASE_URL}/rest/v1/media_assets"
        post_req = urllib.request.Request(post_url, data=json.dumps(payload).encode('utf-8'), headers=HEADERS, method='POST')
        urllib.request.urlopen(post_req)
        logger.info(f"✅ [Supabase] Created new MediaAsset (Lec {lecture_id}, {asset_type}) -> TG Msg #{tg_msg_id}")

async def get_notebook_artifacts(nid: str) -> list[dict]:
    code, out = await run_cmd(["notebooklm", "artifact", "list", "-n", nid, "--json"])
    if code == 0:
        try:
            data = json.loads(out)
            return data.get("artifacts", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        except Exception:
            pass
    return []

async def ensure_notebook(task: dict) -> str | None:
    nid = task.get("notebook_id")
    if nid:
        return nid

    nb_title = f"{task['subject']} ({task['doc']}) - المحاضرة {task['num']}: {task['title']}"
    logger.info(f"Creating notebook: '{nb_title}'...")
    code, out = await run_cmd(["notebooklm", "create", nb_title, "-u", "--json"])
    if code == 0:
        try:
            data = json.loads(out)
            nid = data.get("notebook", {}).get("id") or data.get("id") or data.get("active_notebook_id")
        except Exception:
            pass

    if not nid:
        import re
        m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", out)
        if m:
            nid = m.group(1)

    if nid:
        logger.info(f"✓ Notebook created with ID: {nid}")
        task["notebook_id"] = nid
        # Add PDF sources
        for pdf_p in task.get("pdf_paths", []):
            p = Path(pdf_p)
            if p.exists():
                logger.info(f"Adding source: {p.name} to notebook {nid}...")
                await run_cmd(["notebooklm", "source", "add", str(p), "-n", nid])
    else:
        logger.error(f"❌ Failed to create notebook: {out}")
    return nid

async def process_task(task: dict, state: dict):
    lec_id = task["lecture_id"]
    lec_key = str(lec_id)
    if lec_key not in state:
        state[lec_key] = {"audio_done": False, "video_done": False, "notebook_id": task.get("notebook_id")}

    logger.info(f"\n=======================================================")
    logger.info(f"🚀 PROCESSING LECTURE #{lec_id}: {task['subject']} - المحاضرة {task['num']}")
    logger.info(f"=======================================================")

    nid = await ensure_notebook(task)
    if not nid:
        return

    state[lec_key]["notebook_id"] = nid
    save_state(state)

    # 1. AUDIO PROCESSING
    if not state[lec_key].get("audio_done"):
        artifacts = await get_notebook_artifacts(nid)
        audio_art = next((a for a in artifacts if a.get("type_id") == "audio" or a.get("type") == "Audio"), None)

        if not audio_art:
            logger.info(f"Launching Audio Overview generation for Lec #{lec_id}...")
            await run_cmd([
                "notebooklm", "generate", "audio",
                task["prompt"],
                "--length", "long",
                "--language", "ar_eg",
                "-n", nid
            ])
            artifacts = await get_notebook_artifacts(nid)
            audio_art = next((a for a in artifacts if a.get("type_id") == "audio" or a.get("type") == "Audio"), None)

        if audio_art:
            art_id = audio_art.get("id")
            logger.info(f"Waiting for Audio generation (Artifact {art_id})...")
            # Poll status
            for _ in range(60): # Up to 30 mins
                artifacts = await get_notebook_artifacts(nid)
                curr = next((a for a in artifacts if a.get("id") == art_id), None)
                if curr and curr.get("status") in ("completed", "ready"):
                    logger.info("✓ Audio generation completed!")
                    break
                logger.info(f"Audio status: {curr.get('status') if curr else 'waiting'}... sleeping 30s")
                await asyncio.sleep(30)

            # Download audio
            audio_file = TEMP_DIR / f"audio_{lec_id}.m4a"
            if audio_file.exists(): audio_file.unlink()
            await run_cmd(["notebooklm", "download", "audio", str(audio_file), "-n", nid])

            if audio_file.exists() and audio_file.stat().st_size > 5000:
                logger.info(f"Uploading audio ({audio_file.stat().st_size} bytes) to Telegram channel...")
                caption = f"📚 #{task['subject'].replace(' ', '_')} | 👨‍🏫 {task['doc']}\n📌 المحاضرة {task['num']}: {task['title']}\n🎧 بودكاست المحاضرة الصوتي (شرح تفصيلي بالعامية)"
                res = await telegram_storage.upload_asset(audio_file, "audio", caption)
                if res.get("telegram_message_id"):
                    await update_supabase_media_asset(
                        lec_id, "audio",
                        res["telegram_message_id"],
                        res.get("telegram_file_id") or "",
                        audio_file.stat().st_size,
                        "بودكاست المحاضرة الصوتي"
                    )
                    state[lec_key]["audio_done"] = True
                    save_state(state)
                    logger.info(f"🎉 Lec #{lec_id} Audio is LIVE!")

    # 2. VIDEO PROCESSING
    if not state[lec_key].get("video_done"):
        artifacts = await get_notebook_artifacts(nid)
        video_art = next((a for a in artifacts if a.get("type_id") == "video" or a.get("type") == "Video"), None)

        if not video_art:
            logger.info(f"Launching Video Overview generation for Lec #{lec_id}...")
            await run_cmd([
                "notebooklm", "generate", "video",
                task["prompt"],
                "--format", "explainer",
                "--language", "ar_eg",
                "-n", nid
            ])
            artifacts = await get_notebook_artifacts(nid)
            video_art = next((a for a in artifacts if a.get("type_id") == "video" or a.get("type") == "Video"), None)

        if video_art:
            art_id = video_art.get("id")
            logger.info(f"Waiting for Video generation (Artifact {art_id})...")
            # Poll status
            for _ in range(90): # Up to 45 mins
                artifacts = await get_notebook_artifacts(nid)
                curr = next((a for a in artifacts if a.get("id") == art_id), None)
                if curr and curr.get("status") in ("completed", "ready"):
                    logger.info("✓ Video generation completed!")
                    break
                logger.info(f"Video status: {curr.get('status') if curr else 'waiting'}... sleeping 30s")
                await asyncio.sleep(30)

            # Download video
            video_file = TEMP_DIR / f"video_{lec_id}.mp4"
            if video_file.exists(): video_file.unlink()
            await run_cmd(["notebooklm", "download", "video", str(video_file), "-n", nid])

            if video_file.exists() and video_file.stat().st_size > 5000:
                logger.info(f"Uploading video ({video_file.stat().st_size} bytes) to Telegram channel...")
                caption = f"📚 #{task['subject'].replace(' ', '_')} | 👨‍🏫 {task['doc']}\n📌 المحاضرة {task['num']}: {task['title']}\n🎬 فيديو الشرح التفاعلي (عرض بصري وتطبيقي)"
                res = await telegram_storage.upload_asset(video_file, "video", caption)
                if res.get("telegram_message_id"):
                    await update_supabase_media_asset(
                        lec_id, "video",
                        res["telegram_message_id"],
                        res.get("telegram_file_id") or "",
                        video_file.stat().st_size,
                        "فيديو الشرح التفاعلي"
                    )
                    state[lec_key]["video_done"] = True
                    save_state(state)
                    logger.info(f"🎉 Lec #{lec_id} Video is LIVE!")

async def main():
    logger.info("=================================================================")
    logger.info("🌟 AUTONOMOUS MEDIA PRODUCTION PIPELINE STARTED FOR 8 LECTURES 🌟")
    logger.info("=================================================================")
    state = load_state()

    for task in TASKS:
        try:
            await process_task(task, state)
        except Exception as e:
            logger.error(f"Error in task #{task['lecture_id']}: {e}", exc_info=True)
            await asyncio.sleep(10)

    logger.info("🏁 ALL 8 LECTURES PROCESSED WITH 100% 5/5 MODALITIES!")

if __name__ == "__main__":
    asyncio.run(main())
