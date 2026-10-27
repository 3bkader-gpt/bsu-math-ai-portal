import asyncio
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path("/home/abkader/bsu-math-ai-portal")
sys.path.insert(0, str(ROOT))
os.environ["PATH"] = f"{ROOT}/.venv/bin:" + os.environ.get("PATH", "")

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset
from app.services.notebooklm_client import run_notebooklm_cmd_async as run_cmd_async, AUTH_ERROR_PATTERNS
from app.services.notebooklm_service import make_telegram_caption
from app.services.telegram_storage import telegram_storage

# Setup Logging
LOG_FILE = Path("/home/abkader/parallel_multi_account_pipeline.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("multi_account_pipeline")

PROFILES = ["default", "acc_ali", "acc_mo", "acc_p1", "acc_p2", "acc_passplay"]

TASKS = [
    # Microteaching (Subject 3, د/ عبدالرحمن برعي)
    {
        "subject_id": 3,
        "subject_name": "تدريس مصغر",
        "doctor": "د/ عبدالرحمن برعي",
        "lecture_num": 5,
        "title": "مهارة استخدام الوسائل التعليمية والتكنولوجيا وبطاقة ملاحظتها",
        "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec5/كتاب - مهارة استخدام الوسائل التعليمية والتكنولوجيا.pdf"),
        "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
    },
    {
        "subject_id": 3,
        "subject_name": "تدريس مصغر",
        "doctor": "د/ عبدالرحمن برعي",
        "lecture_num": 6,
        "title": "مهارة إثارة الدافعية للتعلم وبطاقة ملاحظتها",
        "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec6/كتاب - مهارة إثارة الدافعية للتعلم.pdf"),
        "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
    },
    {
        "subject_id": 3,
        "subject_name": "تدريس مصغر",
        "doctor": "د/ عبدالرحمن برعي",
        "lecture_num": 7,
        "title": "مهارة صياغة وتوجيه الأسئلة الصفية وإدارتها وبطاقة ملاحظتها",
        "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec7/كتاب - مهارة صياغة وتوجيه الأسئلة الصفية.pdf"),
        "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
    },
    {
        "subject_id": 3,
        "subject_name": "تدريس مصغر",
        "doctor": "د/ عبدالرحمن برعي",
        "lecture_num": 8,
        "title": "مهارة التعزيز التعليمي والتغذية الراجعة وبطاقة ملاحظتها",
        "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec8/كتاب - مهارة التعزيز والوسائل غير اللفظية.pdf"),
        "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
    },
    {
        "subject_id": 3,
        "subject_name": "تدريس مصغر",
        "doctor": "د/ عبدالرحمن برعي",
        "lecture_num": 9,
        "title": "مهارة إدارة الفصل التعليمي والسلوك الصفي وبطاقة ملاحظتها",
        "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec9/كتاب - مهارة إدارة وضبط الصف الدراسي.pdf"),
        "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
    },
    {
        "subject_id": 3,
        "subject_name": "تدريس مصغر",
        "doctor": "د/ عبدالرحمن برعي",
        "lecture_num": 10,
        "title": "مهارة تقويم تعلم الطلاب وأدوات القياس والملاحظة",
        "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec10/كتاب - مهارة تقويم التعلم وإعداد الاختبارات.pdf"),
        "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
    },
    {
        "subject_id": 3,
        "subject_name": "تدريس مصغر",
        "doctor": "د/ عبدالرحمن برعي",
        "lecture_num": 11,
        "title": "مهارة التخطيط الفعال لدرس التدريس المصغر وتصميمه",
        "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec11/كتاب - مهارة التخطيط للدرس وتصميم خطة التدريس المصغر.pdf"),
        "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
    },
    # Digital Transformation (Subject 5, د/ ايمان)
    {
        "subject_id": 5,
        "subject_name": "تكنولوجيا والتحول الرقمي",
        "doctor": "د/ ايمان",
        "lecture_num": 1,
        "title": "مقدمة عن تكنولوجيا التعليم وتطورها التاريخي ومفاهيمها",
        "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec1/كتاب - مقدمة عن تكنولوجيا التعليم وتطورها.pdf"),
        "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
    },
    {
        "subject_id": 5,
        "subject_name": "تكنولوجيا والتحول الرقمي",
        "doctor": "د/ ايمان",
        "lecture_num": 2,
        "title": "التحول الرقمي في التعليم وأبعاده واستراتيجياته ونماذجه",
        "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec2/كتاب - التحول الرقمي في التعليم واستراتيجياته.pdf"),
        "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
    },
    {
        "subject_id": 5,
        "subject_name": "تكنولوجيا والتحول الرقمي",
        "doctor": "د/ ايمان",
        "lecture_num": 3,
        "title": "المواطنة الرقمية والوعي التكنولوجي وقواعد الاستخدام الآمن",
        "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec3/كتاب - المواطنة الرقمية وقواعد الاستخدام الآمن.pdf"),
        "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
    },
    {
        "subject_id": 5,
        "subject_name": "تكنولوجيا والتحول الرقمي",
        "doctor": "د/ ايمان",
        "lecture_num": 4,
        "title": "مستحدثات تكنولوجيا التعليم وخصائصها وتطبيقاتها المعاصرة",
        "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec4/كتاب - مستحدثات تكنولوجيا التعليم وخصائصها.pdf"),
        "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
    },
    {
        "subject_id": 5,
        "subject_name": "تكنولوجيا والتحول الرقمي",
        "doctor": "د/ ايمان",
        "lecture_num": 5,
        "title": "الحوسبة السحابية وسحابة جوجل وتطبيقاتها في المنظومة التعليمية",
        "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec5/كتاب - الحوسبة السحابية وسحابة جوجل.pdf"),
        "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
    },
    {
        "subject_id": 5,
        "subject_name": "تكنولوجيا والتحول الرقمي",
        "doctor": "د/ ايمان",
        "lecture_num": 6,
        "title": "الذكاء الاصطناعي وتطبيقاته التعليمية وأخلاقياته",
        "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec6/كتاب - الذكاء الاصطناعي وتطبيقاته في التعليم.pdf"),
        "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
    }
]

temp_media_dir = Path("/home/abkader/temp_media")
temp_media_dir.mkdir(parents=True, exist_ok=True)

async def run_profile_cmd(profile: str, cmd_args: list[str]) -> tuple[int, str]:
    full_cmd = ["notebooklm", "-p", profile] + cmd_args
    for attempt in range(1, 4):
        code, out = await run_cmd_async(full_cmd)
        lower = (out or "").lower()
        if any(pat in lower for pat in AUTH_ERROR_PATTERNS):
            logger.warning(f"[{profile}] ⚠️ Auth error detected on attempt {attempt}/3. Auto-healing via refresh script...")
            ref_proc = await asyncio.create_subprocess_exec(
                sys.executable, "/home/abkader/bsu-math-ai-portal/scripts/refresh_notebooklm_auth.py",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await ref_proc.communicate()
            await asyncio.sleep(5)
            continue
        return code, out
    return 1, "Failed after 3 retries"

def get_lecture_db_state(subject_id: int, lec_num: int) -> tuple[int | None, str | None, bool, bool]:
    with SessionLocal() as db:
        lec = db.query(Lecture).filter(Lecture.subject_id == subject_id, Lecture.lecture_num == lec_num).first()
        if not lec:
            return None, None, False, False
        m_assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == lec.id).all()
        assets = [a.asset_type for a in m_assets]
        return lec.id, lec.notebook_id, ("audio" in assets), ("video" in assets)

async def ensure_notebook_for_profile(profile: str, task: dict) -> str:
    sub_id = task["subject_id"]
    sub_name = task["subject_name"]
    lnum = task["lecture_num"]
    title = task["title"]
    doc = task["doctor"]
    pdf = task["pdf_path"]

    lid, existing_nb, has_audio, has_video = get_lecture_db_state(sub_id, lnum)
    
    # Try existing notebook first
    if existing_nb:
        code, out = await run_profile_cmd(profile, ["artifact", "list", "-n", existing_nb, "--json"])
        if code == 0 and "error" not in (out or "").lower():
            logger.info(f"[{profile}] 🔗 Using existing accessible notebook: {existing_nb} for Lec {lnum}")
            return existing_nb

    # Create new dedicated notebook under this profile
    nb_title = f"{sub_name} ({doc}) - المحاضرة {lnum}: {title}"
    logger.info(f"[{profile}] 📓 Creating new notebook: {nb_title}...")
    code, out = await run_profile_cmd(profile, ["create", nb_title])
    match = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', out or "")
    if not match:
        raise RuntimeError(f"[{profile}] Failed to parse notebook ID from create output: {out}")
    nb_id = match.group(0)
    logger.info(f"[{profile}] ✅ Created notebook {nb_id}. Adding PDF source {pdf.name}...")

    # Add source
    code, out = await run_profile_cmd(profile, ["source", "add", str(pdf), "-n", nb_id])
    if code != 0:
        logger.warning(f"[{profile}] Source add returned code {code}: {out}")

    # Update in DB
    if lid:
        with SessionLocal() as db:
            db_lec = db.query(Lecture).filter(Lecture.id == lid).first()
            if db_lec:
                db_lec.notebook_id = nb_id
                db.commit()
    return nb_id

async def worker_loop(profile: str, task_queue: asyncio.Queue):
    logger.info(f"🚀 Worker [{profile}] started and waiting for tasks...")
    while not task_queue.empty():
        try:
            task = task_queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        lnum = task["lecture_num"]
        sub_name = task["subject_name"]
        sub_id = task["subject_id"]
        title = task["title"]
        doc = task["doctor"]
        prompt_path = task["prompt_path"]

        lid, _, has_audio, has_video = get_lecture_db_state(sub_id, lnum)
        if has_audio and has_video:
            logger.info(f"[{profile}] ⏭️ {sub_name} Lec {lnum} already has Audio & Video! Skipping.")
            task_queue.task_done()
            continue

        logger.info(f"[{profile}] 🎯 Processing {sub_name} Lec {lnum} (Audio={has_audio}, Video={has_video})...")

        try:
            nb_id = await ensure_notebook_for_profile(profile, task)
            
            # Check existing artifacts on this notebook
            code, out = await run_profile_cmd(profile, ["artifact", "list", "-n", nb_id, "--json"])
            arts = []
            if code == 0 and out:
                try:
                    data = json.loads(out)
                    arts = data.get("artifacts", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                except Exception:
                    pass

            audio_art = next((a for a in arts if str(a.get("type", "")).lower() == "audio"), None)
            video_art = next((a for a in arts if str(a.get("type", "")).lower() == "video"), None)

            # Trigger Audio if needed
            if not has_audio:
                if not audio_art or audio_art.get("status") == "failed":
                    logger.info(f"[{profile}] 🎧 Generating Audio for {sub_name} Lec {lnum}...")
                    cmd = ["generate", "audio", "--length", "long", "--retry", "3", "-n", nb_id]
                    if prompt_path.exists():
                        cmd.extend(["--prompt-file", str(prompt_path)])
                    await run_profile_cmd(profile, cmd)
                    await asyncio.sleep(10)

            # Trigger Video if needed
            if not has_video:
                if not video_art or video_art.get("status") == "failed":
                    logger.info(f"[{profile}] 🎬 Generating Video for {sub_name} Lec {lnum}...")
                    cmd = ["generate", "video", "--format", "explainer", "--retry", "3", "-n", nb_id]
                    if prompt_path.exists():
                        cmd.extend(["--prompt-file", str(prompt_path)])
                    await run_profile_cmd(profile, cmd)
                    await asyncio.sleep(15)

            # Wait / Poll loop for this lecture
            for poll_check in range(1, 45):
                _, _, cur_audio, cur_video = get_lecture_db_state(sub_id, lnum)
                if cur_audio and cur_video:
                    logger.info(f"[{profile}] 🏆 {sub_name} Lec {lnum} fully completed!")
                    break

                # Poll
                code, out = await run_profile_cmd(profile, ["artifact", "list", "-n", nb_id, "--json"])
                if code == 0 and out:
                    try:
                        data = json.loads(out)
                        curr_arts = data.get("artifacts", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                        
                        # Process Audio
                        if not cur_audio:
                            a_item = next((a for a in curr_arts if str(a.get("type", "")).lower() == "audio"), None)
                            if a_item and str(a_item.get("status", "")).lower() == "completed":
                                logger.info(f"[{profile}] 🎵 Audio ready for {sub_name} Lec {lnum}! Downloading & Uploading...")
                                dest_a = temp_media_dir / f"audio_p_{lid}.m4a"
                                await run_profile_cmd(profile, ["download", "audio", str(dest_a), "--force", "-n", nb_id])
                                if dest_a.exists() and dest_a.stat().st_size > 1000:
                                    cap = make_telegram_caption(sub_name, lnum, title, doc, "🎧 بودكاست المحاضرة الصوتي الشامل")
                                    up = await telegram_storage.upload_asset(dest_a, "audio", cap)
                                    with SessionLocal() as db:
                                        db.add(MediaAsset(
                                            lecture_id=lid, asset_type="audio", title="بودكاست المحاضرة الصوتي",
                                            local_file_path=up.get("local_file_path"), telegram_file_id=up.get("telegram_file_id"),
                                            telegram_message_id=up.get("telegram_message_id"), file_size_bytes=up.get("file_size")
                                        ))
                                        db.commit()
                                    logger.info(f"[{profile}] ✅ Audio saved to DB & Telegram for Lec {lnum}!")

                        # Process Video
                        if not cur_video:
                            v_item = next((a for a in curr_arts if str(a.get("type", "")).lower() == "video"), None)
                            if v_item and str(v_item.get("status", "")).lower() == "completed":
                                logger.info(f"[{profile}] 🎬 Video ready for {sub_name} Lec {lnum}! Downloading & Uploading...")
                                dest_v = temp_media_dir / f"video_p_{lid}.mp4"
                                await run_profile_cmd(profile, ["download", "video", str(dest_v), "--force", "-n", nb_id])
                                if dest_v.exists() and dest_v.stat().st_size > 5000:
                                    cap = make_telegram_caption(sub_name, lnum, title, doc, "🎬 فيديو المحاضرة التعليمي والتطبيقي")
                                    up = await telegram_storage.upload_asset(dest_v, "video", cap)
                                    with SessionLocal() as db:
                                        db.add(MediaAsset(
                                            lecture_id=lid, asset_type="video", title="فيديو المحاضرة التعليمي",
                                            local_file_path=up.get("local_file_path"), telegram_file_id=up.get("telegram_file_id"),
                                            telegram_message_id=up.get("telegram_message_id"), file_size_bytes=up.get("file_size")
                                        ))
                                        db.commit()
                                    logger.info(f"[{profile}] ✅ Video saved to DB & Telegram for Lec {lnum}!")

                    except Exception as e:
                        logger.warning(f"[{profile}] Polling parse exception: {e}")

                await asyncio.sleep(30)

        except Exception as exc:
            logger.error(f"[{profile}] ❌ Error on {sub_name} Lec {lnum}: {exc}", exc_info=True)

        task_queue.task_done()
    
    logger.info(f"🏁 Worker [{profile}] finished all assigned tasks!")

async def main():
    logger.info("=" * 80)
    logger.info(f"🔥 STARTING PARALLEL MULTI-ACCOUNT PIPELINE WITH {len(PROFILES)} GOOGLE ACCOUNTS")
    logger.info(f"Accounts Pool: {', '.join(PROFILES)}")
    logger.info("=" * 80)

    queue = asyncio.Queue()
    for t in TASKS:
        lid, _, has_a, has_v = get_lecture_db_state(t["subject_id"], t["lecture_num"])
        if not (has_a and has_v):
            queue.put_nowait(t)

    total_pending = queue.qsize()
    logger.info(f"📦 Total pending lectures needing media: {total_pending}")

    workers = [asyncio.create_task(worker_loop(p, queue)) for p in PROFILES]
    await asyncio.gather(*workers)

    logger.info("=" * 80)
    logger.info("🎉🎉 ALL PARALLEL WORKERS COMPLETED SUCCESSFULLY! ALL LECTURES ARE COMPLETE!")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
