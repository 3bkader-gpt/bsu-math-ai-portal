import asyncio
import json
import logging
import os
import shutil
import sys
import time
from pathlib import Path

# UTF-8 stdout
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

LOG_FILE = Path("/home/abkader/microteaching_pipeline.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(str(LOG_FILE), encoding="utf-8")
    ]
)
logger = logging.getLogger("MicroteachingOrchestrator")

ROOT = Path("/home/abkader/bsu-math-ai-portal")
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ensure .venv/bin is in PATH for notebooklm CLI discovery
venv_bin = str(ROOT / ".venv" / "bin")
if venv_bin not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{venv_bin}:{os.environ.get('PATH', '')}"

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset
from app.services.notebooklm_service import NotebookLMPipeline, make_telegram_caption
from app.services.notebooklm_client import run_notebooklm_cmd_async as run_cmd_async
from app.services.telegram_storage import telegram_storage

# =============================================================================
# RATE LIMITING & CONCURRENCY CONFIGURATION
# =============================================================================
# Google NotebookLM restricts video generation to 1 active generation per account.
# Firing multiple videos causes immediate 429 Too Many Requests or RESOURCE_EXHAUSTED.
MAX_CONCURRENT_VIDEOS = 1       # Strictly serialized: at most 1 video in-progress
VIDEO_COOLDOWN_SECONDS = 90     # Cooldown between successive video triggers
AUDIO_COOLDOWN_SECONDS = 30     # Cooldown between audio triggers
RATE_LIMIT_BACKOFF_BASE = 120   # Backoff sleep (seconds) upon detecting a rate-limit error

SUBJECT_NAME = "تدريس مصغر"
DOCTOR_NAME = "د/ عبدالرحمن برعي"
PROMPT_FILE = ROOT / "prompts" / "تدريس مصغر.txt"

MICROTEACHING_TASKS = [
    {
        "lecture_num": 1,
        "title": "الإطار النظري والتنظيمي للتدريس المصغر ومراحله",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec1"),
        "pdf_name": "كتاب - الإطار النظري والتنظيمي للتدريس المصغر.pdf"
    },
    {
        "lecture_num": 2,
        "title": "مهارات تخطيط دروس الرياضيات وتحليل المحتوى وصياغة الأهداف السلوكية",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec2"),
        "pdf_name": "كتاب - مهارات تخطيط دروس الرياضيات (تحليل المحتوى والأهداف السلوكية).pdf"
    },
    {
        "lecture_num": 3,
        "title": "استراتيجيات التدريس وبناء خطة التدريس المصغر (الدريسة)",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec3"),
        "pdf_name": "كتاب - استراتيجيات التدريس وبناء خطة التدريس المصغر (الدريسة).pdf"
    },
    {
        "lecture_num": 4,
        "title": "مهارة التهيئة لموضوع الدرس وأنواعها وبطاقة ملاحظتها",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec4"),
        "pdf_name": "كتاب - مهارة التهيئة لموضوع الدرس وبطاقة ملاحظتها.pdf"
    },
    {
        "lecture_num": 5,
        "title": "مهارة استخدام الوسائل التعليمية والتكنولوجيا وبطاقة ملاحظتها",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec5"),
        "pdf_name": "كتاب - مهارة استخدام الوسائل التعليمية وبطاقة ملاحظتها.pdf"
    },
    {
        "lecture_num": 6,
        "title": "مهارة الشرح والتفسير الرياضي وبطاقة ملاحظتها",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec6"),
        "pdf_name": "كتاب - مهارة الشرح والتفسير الرياضي وبطاقة ملاحظتها.pdf"
    },
    {
        "lecture_num": 7,
        "title": "مهارة التواصل اللفظي وغير اللفظي ولغة الجسد وبطاقة ملاحظتها",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec7"),
        "pdf_name": "كتاب - مهارة التواصل اللفظي وغير اللفظي وبطاقة ملاحظتها.pdf"
    },
    {
        "lecture_num": 8,
        "title": "مهارة صياغة وطرح الأسئلة الصفية وزمن الانتظار وبطاقة ملاحظتها",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec8"),
        "pdf_name": "كتاب - مهارة صياغة وطرح الأسئلة الصفية وبطاقة ملاحظتها.pdf"
    },
    {
        "lecture_num": 9,
        "title": "مهارة التعزيز الصفي الإيجابي وأنواعه وبطاقة ملاحظتها",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec9"),
        "pdf_name": "كتاب - مهارة التعزيز الصفي وبطاقة ملاحظتها.pdf"
    },
    {
        "lecture_num": 10,
        "title": "مهارة إدارة الصف المدرسي والانضباط الصفي وبطاقة ملاحظتها",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec10"),
        "pdf_name": "كتاب - مهارة إدارة الصف المدرسي وبطاقة ملاحظتها.pdf"
    },
    {
        "lecture_num": 11,
        "title": "مهارة غلق وتلخيص الدرس والتقويم الختامي وبطاقة ملاحظتها",
        "folder": Path("/home/abkader/incoming_pdfs/microteaching/lec11"),
        "pdf_name": "كتاب - مهارة غلق وتلخيص الدرس وبطاقة ملاحظتها.pdf"
    }
]

def is_rate_limit_error(out_text: str) -> bool:
    """Detects Google rate limiting or quota exhaustion across output."""
    t = (out_text or "").lower()
    return any(p in t for p in [
        "rate limit", "quota", "429", "too many requests",
        "resource_exhausted", "concurrent generation", "cooldown"
    ])

async def is_video_generating(notebook_ids: list[str]) -> bool:
    """Checks if any video generation is currently in progress across notebooks."""
    for nb in notebook_ids:
        code, out = await run_cmd_async(["notebooklm", "artifact", "list", "-n", nb, "--type", "video", "--json"])
        if code == 0 and out:
            try:
                data = json.loads(out)
                items = data.get("artifacts", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                for it in items:
                    if str(it.get("status", "")).lower() == "in_progress":
                        return True
            except Exception:
                pass
    return False

async def safe_trigger_video(nb_id: str, prompt_path: str | None, monitored_notebook_ids: list[str]) -> bool:
    """
    Triggers video generation with:
    1. Check that no other video is currently in progress.
    2. Retry and exponential backoff on 429 / quota limits.
    3. Mandatory cooldown after launch.
    """
    # 1. Wait if another video is in progress (up to 20 minutes)
    for check_attempt in range(1, 41):
        if not await is_video_generating(monitored_notebook_ids):
            break
        logger.info(f"⏳ Another video is currently generating in Google Cloud. Waiting 30s (check {check_attempt}/40)...")
        await asyncio.sleep(30)

    # 2. Trigger video with CLI retry & orchestrator backoff
    video_cmd = ["notebooklm", "generate", "video", "--format", "explainer", "--retry", "3", "-n", nb_id]
    if prompt_path:
        video_cmd.extend(["--prompt-file", prompt_path])

    for attempt in range(1, 4):
        logger.info(f"🎬 Triggering Video generation (attempt {attempt}/3) for notebook {nb_id}...")
        code, out = await run_cmd_async(video_cmd)
        if code == 0 and not is_rate_limit_error(out):
            logger.info(f"✅ Video generation queued successfully in Google Cloud!")
            logger.info(f"⏳ Sleeping {VIDEO_COOLDOWN_SECONDS}s video cooldown to respect API rate limits...")
            await asyncio.sleep(VIDEO_COOLDOWN_SECONDS)
            return True
        elif is_rate_limit_error(out):
            backoff = RATE_LIMIT_BACKOFF_BASE * attempt
            logger.warning(f"⚠️ Video Rate Limit detected from Google: {out[:200]}. Backing off for {backoff}s...")
            await asyncio.sleep(backoff)
        else:
            logger.warning(f"⚠️ Video launch returned code {code}: {out[:200]}")
            await asyncio.sleep(20)

    logger.error("❌ Could not trigger video after 3 rate-limit backoff attempts. Deferring to media worker.")
    return False

async def trigger_audio_overview(nb_id: str, prompt_path: str | None):
    """Triggers long podcast audio overview with rate-limit awareness."""
    audio_cmd = ["notebooklm", "generate", "audio", "--length", "long", "--retry", "3", "-n", nb_id]
    if prompt_path:
        audio_cmd.extend(["--prompt-file", prompt_path])
    logger.info(f"🎧 Launching Audio Podcast generation for notebook {nb_id}...")
    await run_cmd_async(audio_cmd)
    logger.info(f"⏳ Sleeping {AUDIO_COOLDOWN_SECONDS}s audio cooldown...")
    await asyncio.sleep(AUDIO_COOLDOWN_SECONDS)

async def process_lecture_core(task: dict, idx: int, total: int) -> tuple[int, str]:
    """
    Phase 1: Generates the entire Academic Study Suite (Quiz, Guide, Cards, Mind Map, PDF)
    and publishes the lecture live for students immediately!
    """
    lec_num = task["lecture_num"]
    title = task["title"]
    pdf_path = task["folder"] / task["pdf_name"]
    prompt_path = str(PROMPT_FILE) if PROMPT_FILE.exists() else None

    logger.info("=" * 80)
    logger.info(f"[{idx}/{total}] 📘 PROCESSING: {SUBJECT_NAME} - المحاضرة {lec_num}: {title}")
    logger.info(f"    Doctor: {DOCTOR_NAME} | PDF: {pdf_path.name}")
    logger.info("=" * 80)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    # 1. DB Record
    with SessionLocal() as db:
        subj = db.query(Subject).filter(Subject.name == SUBJECT_NAME).first()
        if not subj:
            subj = Subject(name=SUBJECT_NAME, folder_path=str(task["folder"].parent), prompt_path=prompt_path)
            db.add(subj)
            db.commit()
            db.refresh(subj)

        lec = db.query(Lecture).filter(Lecture.subject_id == subj.id, Lecture.lecture_num == lec_num).first()
        if not lec:
            lec = Lecture(
                subject_id=subj.id,
                lecture_num=lec_num,
                title=title,
                doctor=DOCTOR_NAME,
                status="processing",
                stage_info="جاري إنشاء الدفتر الذكي ورفع المصادر... 🧠"
            )
            db.add(lec)
            db.commit()
            db.refresh(lec)
            logger.info(f"✅ Created Lecture DB ID {lec.id}")
        else:
            lec.title = title
            lec.doctor = DOCTOR_NAME
            lec.status = "processing"
            lec.stage_info = "جاري معالجة وتحديث المخرجات الأكاديمية... 🔄"
            db.commit()
            logger.info(f"🔄 Re-using Lecture DB ID {lec.id}")

        lecture_id = int(lec.id)

    temp_dir = Path("/home/abkader/temp_runs") / f"micro_{lecture_id}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 2. Create Notebook
        nb_title = f"{SUBJECT_NAME} ({DOCTOR_NAME}) - المحاضرة {lec_num}: {title}"
        logger.info(f"Creating Notebook: '{nb_title}'")
        nb_id = await NotebookLMPipeline.create_notebook(nb_title)
        logger.info(f"✅ Notebook created: {nb_id}")

        with SessionLocal() as db:
            l = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            if l:
                l.notebook_id = nb_id
                db.commit()

        # 3. Add Source PDF & Upload original_pdf to Telegram CDN
        logger.info(f"Adding source to notebook: {pdf_path.name}...")
        await NotebookLMPipeline.add_source(nb_id, pdf_path)

        logger.info(f"Uploading original PDF to Telegram CDN...")
        cap_pdf = make_telegram_caption(SUBJECT_NAME, lec_num, title, DOCTOR_NAME, "📄 ملف المحاضرة المعتمد", pdf_path.name)
        up_pdf = await telegram_storage.upload_asset(pdf_path, "pdf", cap_pdf)
        with SessionLocal() as db:
            db.add(MediaAsset(
                lecture_id=lecture_id,
                asset_type="original_pdf",
                title=pdf_path.name,
                local_file_path=up_pdf.get("local_file_path"),
                telegram_file_id=up_pdf.get("telegram_file_id"),
                telegram_message_id=up_pdf.get("telegram_message_id"),
                file_size_bytes=up_pdf.get("file_size")
            ))
            db.commit()
        logger.info(f"✅ Original PDF uploaded and stored (Telegram msg {up_pdf.get('telegram_message_id')})")

        # 4. Generate Academic Text Suite (Quiz, Guide, Cards, Mind Map)
        logger.info("Generating Academic Suite (Quiz, Guide, Cards, Mind Map)...")
        quiz_cmd = [
            "notebooklm", "generate", "quiz",
            "اختبار شامل مع تلميحات وشرح الإجابات. لكل سؤال أضف بعد الخيارات سطر Hint بإجابة صغيرة، "
            "وأسفل الهينت بلوك Steps فيه خطوات الحل والتحليل التربوي النموذجي مرقمة.",
            "--quantity", "more", "--wait", "--retry", "3", "-n", nb_id
        ]
        report_cmd = [
            "notebooklm", "generate", "report",
            "--format", "study-guide", "--wait", "--retry", "3", "-n", nb_id
        ]
        cards_cmd = [
            "notebooklm", "generate", "flashcards",
            "أهم المفاهيم التربوية والمهارات التدريسية ومعايير الملاحظة",
            "--quantity", "more", "--wait", "--retry", "3", "-n", nb_id
        ]
        map_cmd = [
            "notebooklm", "generate", "mind-map",
            "--kind", "note-backed", "-n", nb_id
        ]

        await asyncio.gather(
            run_cmd_async(quiz_cmd),
            run_cmd_async(report_cmd),
            run_cmd_async(cards_cmd),
            run_cmd_async(map_cmd)
        )
        logger.info("✅ All 4 text artifacts generated by Google Cloud!")

        # 5. Download and store text artifacts
        text_configs = [
            ("quiz", "quiz.md", "quiz_md", "كويز المحاضرة", "📝 كويز تفاعلي وبنك الأسئلة الكامل"),
            ("report", "study_guide.md", "study_guide_md", "دليل دراسي وملخص", "📚 دليل دراسي وملخص شامل"),
            ("flashcards", "flashcards.md", "flashcards_md", "بطاقات تعليمية", "🃏 بطاقات استذكار تعليمية"),
            ("mind-map", "mind_map.json", "mind_map_json", "خريطة ذهنية", "🧠 خريطة ذهنية ومفاهيمية"),
        ]

        for kind, fname, asset_type, asset_title, label in text_configs:
            dest = temp_dir / fname
            dl_cmd = ["notebooklm", "download", kind, "--force", "-n", nb_id]
            if kind in ("quiz", "flashcards"):
                dl_cmd.extend(["--format", "markdown"])
            dl_cmd.append(str(dest))

            await run_cmd_async(dl_cmd)
            if dest.exists() and dest.stat().st_size > 10:
                txt = dest.read_text(encoding="utf-8", errors="replace")
                cap = make_telegram_caption(SUBJECT_NAME, lec_num, title, DOCTOR_NAME, label)
                up_res = await telegram_storage.upload_asset(dest, asset_type, cap)
                with SessionLocal() as db:
                    db.add(MediaAsset(
                        lecture_id=lecture_id,
                        asset_type=asset_type,
                        title=asset_title,
                        content_text=txt,
                        local_file_path=up_res.get("local_file_path"),
                        telegram_file_id=up_res.get("telegram_file_id"),
                        telegram_message_id=up_res.get("telegram_message_id"),
                        file_size_bytes=up_res.get("file_size")
                    ))
                    db.commit()
                logger.info(f"✅ Saved {asset_type} ({len(txt)} chars) in DB & Telegram")
            else:
                logger.warning(f"⚠️ Missing download for {kind}")

        # 6. Fast Publishing: Lecture is ready for students!
        with SessionLocal() as db:
            l = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            if l:
                l.status = "completed"
                l.stage_info = "المحاضرة جاهزة ومتاحة للمذاكرة والكويزات والملخصات ✅ (جاري معالجة الصوت والفيديو 🎧)"
                db.commit()

        logger.info(f"🎉 LECTURE {lecture_id} (تدريس مصغر م{lec_num}) IS NOW LIVE FOR STUDENTS!")
        return lecture_id, nb_id

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

async def poll_and_sync_media(notebook_tasks: list[tuple[int, str, dict]], max_poll_minutes: int = 40):
    """
    Phase 3: Periodically checks notebooks for completed audio and video artifacts,
    downloads them, uploads to Telegram CDN, and attaches them to Supabase.
    """
    logger.info("=" * 80)
    logger.info("📡 PHASE 3: BACKGROUND MEDIA COLLECTOR STARTED")
    logger.info(f"   Monitoring {len(notebook_tasks)} lectures for completed Audio & Video...")
    logger.info("=" * 80)

    pending_media = {}
    for lec_id, nb_id, task in notebook_tasks:
        pending_media[lec_id] = {
            "nb_id": nb_id,
            "task": task,
            "audio_done": False,
            "video_done": False
        }

    temp_media_dir = Path("/home/abkader/temp_runs/media_collector")
    temp_media_dir.mkdir(parents=True, exist_ok=True)

    end_time = time.time() + (max_poll_minutes * 60)

    while time.time() < end_time:
        all_finished = True
        for lec_id, state in list(pending_media.items()):
            nb_id = state["nb_id"]
            task = state["task"]
            lec_num = task["lecture_num"]
            title = task["title"]

            if state["audio_done"] and state["video_done"]:
                continue

            all_finished = False

            code, out = await run_cmd_async(["notebooklm", "artifact", "list", "-n", nb_id, "--json"])
            if code != 0 or not out:
                continue

            try:
                data = json.loads(out)
                artifacts = data.get("artifacts", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            except Exception:
                continue

            # Check Audio
            if not state["audio_done"]:
                audio_art = next((a for a in artifacts if str(a.get("type", "")).lower() == "audio" and str(a.get("status", "")).lower() == "completed"), None)
                if audio_art:
                    logger.info(f"🎵 Audio completed for Lec {lec_num}! Downloading...")
                    dest_audio = temp_media_dir / f"audio_{lec_id}.m4a"
                    await run_cmd_async(["notebooklm", "download", "audio", str(dest_audio), "--force", "-n", nb_id])
                    if dest_audio.exists() and dest_audio.stat().st_size > 1000:
                        cap = make_telegram_caption(SUBJECT_NAME, lec_num, title, DOCTOR_NAME, "🎧 بودكاست المحاضرة الصوتي الشامل")
                        up = await telegram_storage.upload_asset(dest_audio, "audio", cap)
                        with SessionLocal() as db:
                            db.add(MediaAsset(
                                lecture_id=lec_id,
                                asset_type="audio",
                                title="بودكاست المحاضرة الصوتي",
                                local_file_path=up.get("local_file_path"),
                                telegram_file_id=up.get("telegram_file_id"),
                                telegram_message_id=up.get("telegram_message_id"),
                                file_size_bytes=up.get("file_size")
                            ))
                            db.commit()
                        logger.info(f"✅ Audio uploaded to Telegram for Lec {lec_num}")
                        state["audio_done"] = True
                        dest_audio.unlink(missing_ok=True)

            # Check Video
            if not state["video_done"]:
                video_art = next((a for a in artifacts if str(a.get("type", "")).lower() == "video" and str(a.get("status", "")).lower() == "completed"), None)
                if video_art:
                    logger.info(f"🎬 Video completed for Lec {lec_num}! Downloading...")
                    dest_video = temp_media_dir / f"video_{lec_id}.mp4"
                    await run_cmd_async(["notebooklm", "download", "video", str(dest_video), "--force", "-n", nb_id])
                    if dest_video.exists() and dest_video.stat().st_size > 5000:
                        cap = make_telegram_caption(SUBJECT_NAME, lec_num, title, DOCTOR_NAME, "🎬 فيديو المحاضرة التعليمي والتطبيقي")
                        up = await telegram_storage.upload_asset(dest_video, "video", cap)
                        with SessionLocal() as db:
                            db.add(MediaAsset(
                                lecture_id=lec_id,
                                asset_type="video",
                                title="فيديو المحاضرة التعليمي",
                                local_file_path=up.get("local_file_path"),
                                telegram_file_id=up.get("telegram_file_id"),
                                telegram_message_id=up.get("telegram_message_id"),
                                file_size_bytes=up.get("file_size")
                            ))
                            db.commit()
                        logger.info(f"✅ Video uploaded to Telegram for Lec {lec_num}")
                        state["video_done"] = True
                        dest_video.unlink(missing_ok=True)

        if all_finished:
            logger.info("🏆 ALL MEDIA ASSETS (AUDIO & VIDEO) ARE 100% COMPLETED AND ATTACHED!")
            break

        logger.info("⏳ Media polling tick: waiting 45s before next check...")
        await asyncio.sleep(45)

    shutil.rmtree(temp_media_dir, ignore_errors=True)

async def main():
    total_lectures = len(MICROTEACHING_TASKS)
    prompt_path = str(PROMPT_FILE) if PROMPT_FILE.exists() else None

    logger.info("=" * 80)
    logger.info(f"🌟 INITIALIZING RATE-LIMITED PIPELINE FOR {total_lectures} LECTURES OF '{SUBJECT_NAME}'")
    logger.info(f"   Policy: 1 Lecture at a time (Sequential), Concurrency Cap: {MAX_CONCURRENT_VIDEOS}")
    logger.info(f"   Video Cooldown: {VIDEO_COOLDOWN_SECONDS}s, Audio Cooldown: {AUDIO_COOLDOWN_SECONDS}s")
    logger.info("=" * 80)

    completed_notebooks = []

    # =========================================================================
    # PHASE 1: SEQUENTIAL ACADEMIC FAST-TRACK
    # One-by-one: Text Suite (Quiz, Guide, Cards, Mind Map) + Original PDF
    # All 11 lectures become live for students in ~8-10 minutes!
    # =========================================================================
    for idx, task in enumerate(MICROTEACHING_TASKS, 1):
        try:
            lec_id, nb_id = await process_lecture_core(task, idx, total_lectures)
            completed_notebooks.append((lec_id, nb_id, task))
            logger.info("⏳ Spacing cooldown 10s before next lecture...")
            await asyncio.sleep(10)
        except Exception as e:
            logger.exception(f"❌ Error processing lecture {task['lecture_num']}: {e}")

    logger.info("=" * 80)
    logger.info(f"🎉 PHASE 1 COMPLETE: All {len(completed_notebooks)} lectures are LIVE with full text assets!")
    logger.info("=" * 80)

    all_nb_ids = [nb_id for _, nb_id, _ in completed_notebooks]

    # =========================================================================
    # PHASE 2: RATE-LIMITED MEDIA ENGINE (AUDIO & VIDEO)
    # Strictly serialized: At most 1 video generating at any time.
    # Cooldown of 90s between video requests to avoid Google 429 quota errors.
    # =========================================================================
    logger.info("=" * 80)
    logger.info("🎬 PHASE 2: LAUNCHING RATE-LIMITED MEDIA GENERATION (ONE VIDEO AT A TIME)")
    logger.info("=" * 80)

    for idx, (lec_id, nb_id, task) in enumerate(completed_notebooks, 1):
        try:
            logger.info(f"[{idx}/{len(completed_notebooks)}] Triggering Media for Lec {task['lecture_num']} (Notebook: {nb_id})...")
            # 1. Trigger Audio
            await trigger_audio_overview(nb_id, prompt_path)
            # 2. Trigger Video with Concurrency Check & Cooldown
            await safe_trigger_video(nb_id, prompt_path, all_nb_ids)
        except Exception as me:
            logger.exception(f"⚠️ Error triggering media for lecture {task['lecture_num']}: {me}")

    logger.info("=" * 80)
    logger.info("🏁 ALL MEDIA JOBS QUEUED UNDER RATE LIMITER. PROCEEDING TO MEDIA COLLECTOR...")
    logger.info("=" * 80)

    # =========================================================================
    # PHASE 3: BACKGROUND MEDIA COLLECTOR
    # Polls for completed audio and video, downloads, and uploads to Telegram & DB
    # =========================================================================
    await poll_and_sync_media(completed_notebooks, max_poll_minutes=60)

if __name__ == "__main__":
    asyncio.run(main())
