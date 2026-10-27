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

LOG_FILE = Path("/home/abkader/unified_night_orchestrator.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(str(LOG_FILE), encoding="utf-8")
    ]
)
logger = logging.getLogger("NightOrchestrator")

ROOT = Path("/home/abkader/bsu-math-ai-portal")
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

venv_bin = str(ROOT / ".venv" / "bin")
if venv_bin not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{venv_bin}:{os.environ.get('PATH', '')}"

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset
from app.services.notebooklm_service import NotebookLMPipeline, make_telegram_caption
from app.services.notebooklm_client import run_notebooklm_cmd_async as run_cmd_async, run_notebooklm_cmd
from app.services.telegram_storage import telegram_storage

# =============================================================================
# RATE LIMITING & COOLDOWN CONFIGURATION
# =============================================================================
MAX_CONCURRENT_VIDEOS = 1       # Strictly at most 1 video generation active
VIDEO_COOLDOWN_SECONDS = 90     # Cooldown between video requests
AUDIO_COOLDOWN_SECONDS = 30     # Cooldown between audio requests
RATE_LIMIT_BACKOFF_BASE = 120   # Backoff sleep on 429/quota error

# Subject 5: تكنولوجيا والتحول الرقمي
SUBJECT_DIGITAL = "تكنولوجيا والتحول الرقمي"
DOCTOR_DIGITAL = "د/ ايمان"
PROMPT_DIGITAL = ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"

DIGITAL_TASKS = [
    {
        "lecture_num": 1,
        "title": "مقدمة عن تكنولوجيا التعليم وتطورها التاريخي ومفاهيمها",
        "folder": Path("/home/abkader/incoming_pdfs/digital_transformation/lec1"),
        "pdf_name": "كتاب - مقدمة عن تكنولوجيا التعليم وتطورها.pdf"
    },
    {
        "lecture_num": 2,
        "title": "التحول الرقمي في التعليم وأبعاده واستراتيجياته ونماذجه",
        "folder": Path("/home/abkader/incoming_pdfs/digital_transformation/lec2"),
        "pdf_name": "كتاب - التحول الرقمي في التعليم واستراتيجياته.pdf"
    },
    {
        "lecture_num": 3,
        "title": "المواطنة الرقمية والوعي التكنولوجي وقواعد الاستخدام الآمن",
        "folder": Path("/home/abkader/incoming_pdfs/digital_transformation/lec3"),
        "pdf_name": "كتاب - المواطنة الرقمية وقواعد الاستخدام الآمن.pdf"
    },
    {
        "lecture_num": 4,
        "title": "مستحدثات تكنولوجيا التعليم وخصائصها وتطبيقاتها المعاصرة",
        "folder": Path("/home/abkader/incoming_pdfs/digital_transformation/lec4"),
        "pdf_name": "كتاب - مستحدثات تكنولوجيا التعليم وخصائصها.pdf"
    },
    {
        "lecture_num": 5,
        "title": "الحوسبة السحابية وسحابة جوجل وتطبيقاتها في المنظومة التعليمية",
        "folder": Path("/home/abkader/incoming_pdfs/digital_transformation/lec5"),
        "pdf_name": "كتاب - الحوسبة السحابية وسحابة جوجل.pdf"
    },
    {
        "lecture_num": 6,
        "title": "الذكاء الاصطناعي وتطبيقاته التعليمية وأخلاقياته",
        "folder": Path("/home/abkader/incoming_pdfs/digital_transformation/lec6"),
        "pdf_name": "كتاب - الذكاء الاصطناعي وتطبيقاته في التعليم.pdf"
    }
]

def is_rate_limit_error(out_text: str) -> bool:
    t = (out_text or "").lower()
    return any(p in t for p in [
        "rate limit", "quota", "429", "too many requests",
        "resource_exhausted", "concurrent generation", "cooldown"
    ])

async def is_video_generating(notebook_ids: list[str]) -> bool:
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

async def safe_trigger_video(nb_id: str, prompt_path: str | None, monitored_ids: list[str]) -> bool:
    for check in range(1, 41):
        if not await is_video_generating(monitored_ids):
            break
        logger.info(f"⏳ Another video is in progress. Waiting 30s (check {check}/40)...")
        await asyncio.sleep(30)

    video_cmd = ["notebooklm", "generate", "video", "--format", "explainer", "--retry", "3", "-n", nb_id]
    if prompt_path:
        video_cmd.extend(["--prompt-file", prompt_path])

    for attempt in range(1, 4):
        logger.info(f"🎬 Launching Video generation (attempt {attempt}/3) for {nb_id}...")
        code, out = await run_cmd_async(video_cmd)
        if code == 0 and not is_rate_limit_error(out):
            logger.info("✅ Video queued successfully in Google Cloud!")
            logger.info(f"⏳ Cooldown {VIDEO_COOLDOWN_SECONDS}s...")
            await asyncio.sleep(VIDEO_COOLDOWN_SECONDS)
            return True
        elif is_rate_limit_error(out):
            backoff = RATE_LIMIT_BACKOFF_BASE * attempt
            logger.warning(f"⚠️ Video Rate Limit: backing off {backoff}s...")
            await asyncio.sleep(backoff)
        else:
            logger.warning(f"⚠️ Video launch returned code {code}: {out[:200]}")
            await asyncio.sleep(20)

    logger.error("❌ Failed to trigger video after 3 backoff attempts.")
    return False

async def trigger_audio_overview(nb_id: str, prompt_path: str | None):
    audio_cmd = ["notebooklm", "generate", "audio", "--length", "long", "--retry", "3", "-n", nb_id]
    if prompt_path:
        audio_cmd.extend(["--prompt-file", prompt_path])
    logger.info(f"🎧 Launching Audio Podcast generation for notebook {nb_id}...")
    await run_cmd_async(audio_cmd)
    logger.info(f"⏳ Audio cooldown {AUDIO_COOLDOWN_SECONDS}s...")
    await asyncio.sleep(AUDIO_COOLDOWN_SECONDS)

async def process_single_lecture_core(task: dict, idx: int, total: int, subject_name: str, doctor_name: str, prompt_file: Path) -> tuple[int, str]:
    lec_num = task["lecture_num"]
    title = task["title"]
    pdf_path = task["folder"] / task["pdf_name"]
    prompt_path = str(prompt_file) if prompt_file.exists() else None

    logger.info("=" * 80)
    logger.info(f"[{idx}/{total}] 📘 PROCESSING: {subject_name} - المحاضرة {lec_num}: {title}")
    logger.info(f"    Doctor: {doctor_name} | PDF: {pdf_path.name}")
    logger.info("=" * 80)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    # 1. DB Record
    with SessionLocal() as db:
        subj = db.query(Subject).filter(Subject.name == subject_name).first()
        if not subj:
            subj = Subject(name=subject_name, folder_path=str(task["folder"].parent), prompt_path=prompt_path)
            db.add(subj)
            db.commit()
            db.refresh(subj)

        lec = db.query(Lecture).filter(Lecture.subject_id == subj.id, Lecture.lecture_num == lec_num).first()
        if not lec:
            lec = Lecture(
                subject_id=subj.id,
                lecture_num=lec_num,
                title=title,
                doctor=doctor_name,
                status="processing",
                stage_info="جاري إنشاء الدفتر الذكي ورفع المصادر... 🧠"
            )
            db.add(lec)
            db.commit()
            db.refresh(lec)
            logger.info(f"✅ Created Lecture DB ID {lec.id}")
        else:
            lec.title = title
            lec.doctor = doctor_name
            lec.status = "processing"
            lec.stage_info = "جاري معالجة وتحديث المخرجات الأكاديمية... 🔄"
            db.commit()
            logger.info(f"🔄 Re-using Lecture DB ID {lec.id}")

        lecture_id = int(lec.id)

    temp_dir = Path("/home/abkader/temp_runs") / f"digital_{lecture_id}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 2. Create Notebook
        nb_title = f"{subject_name} ({doctor_name}) - المحاضرة {lec_num}: {title}"
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
        cap_pdf = make_telegram_caption(subject_name, lec_num, title, doctor_name, "📄 ملف المحاضرة المعتمد", pdf_path.name)
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
            "وأسفل الهينت بلوك Steps فيه خطوات الحل والشرح التقني النموذجي مرقمة.",
            "--quantity", "more", "--wait", "--retry", "3", "-n", nb_id
        ]
        report_cmd = [
            "notebooklm", "generate", "report",
            "--format", "study-guide", "--wait", "--retry", "3", "-n", nb_id
        ]
        cards_cmd = [
            "notebooklm", "generate", "flashcards",
            "أهم المفاهيم التكنولوجية والتحول الرقمي والمصطلحات التقنية",
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
                cap = make_telegram_caption(subject_name, lec_num, title, doctor_name, label)
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

        logger.info(f"🎉 LECTURE {lecture_id} ({subject_name} م{lec_num}) IS NOW LIVE FOR STUDENTS!")
        return lecture_id, nb_id

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

async def reconcile_all_17_lectures():
    """
    Scans all 17 lectures across 'تدريس مصغر' (11) and 'تكنولوجيا والتحول الرقمي' (6),
    downloads and uploads any completed audio/video, retries failed ones, and ensures
    100% of assets are attached.
    """
    logger.info("=" * 80)
    logger.info("🔍 STARTING GLOBAL RECONCILIATION FOR ALL 17 LECTURES")
    logger.info("=" * 80)

    with SessionLocal() as db:
        lecs = db.query(Lecture).filter(Lecture.subject_id.in_([3, 5])).order_by(Lecture.subject_id, Lecture.lecture_num).all()
        target_lectures = [(l.id, l.subject_id, l.lecture_num, l.title, l.doctor, l.notebook_id) for l in lecs]

    temp_media_dir = Path("/home/abkader/temp_runs/global_media_reconciler")
    temp_media_dir.mkdir(parents=True, exist_ok=True)

    # 1. Quick check for missing text assets
    for lid, sid, lnum, title, doc, nbid in target_lectures:
        if not nbid:
            continue
        sub_name = "تدريس مصغر" if sid == 3 else "تكنولوجيا والتحول الرقمي"
        with SessionLocal() as db:
            types = {a.asset_type for a in db.query(MediaAsset.asset_type).filter(MediaAsset.lecture_id == lid).all()}

        if "mind_map_json" not in types:
            logger.info(f"🧠 Generating missing Mind Map for {sub_name} Lec {lnum}...")
            await run_cmd_async(["notebooklm", "generate", "mind-map", "--kind", "note-backed", "-n", nbid])
            dest_mm = temp_media_dir / f"mm_{lid}.json"
            await run_cmd_async(["notebooklm", "download", "mind-map", str(dest_mm), "--force", "-n", nbid])
            if dest_mm.exists() and dest_mm.stat().st_size > 10:
                txt = dest_mm.read_text(encoding="utf-8", errors="replace")
                cap = make_telegram_caption(sub_name, lnum, title, doc, "🧠 خريطة ذهنية ومفاهيمية (Mind Map)")
                up = await telegram_storage.upload_asset(dest_mm, "mind_map_json", cap)
                with SessionLocal() as db:
                    db.add(MediaAsset(
                        lecture_id=lid, asset_type="mind_map_json", title="خريطة ذهنية",
                        content_text=txt, local_file_path=up.get("local_file_path"),
                        telegram_file_id=up.get("telegram_file_id"),
                        telegram_message_id=up.get("telegram_message_id"),
                        file_size_bytes=up.get("file_size")
                    ))
                    db.commit()
                logger.info(f"✅ Added mind_map_json for {sub_name} Lec {lnum}")
                dest_mm.unlink(missing_ok=True)

    # 2. Continuous media polling loop for audio & video
    logger.info("📡 Starting Media Sync loop (Audio & Video)...")
    for cycle in range(1, 40):
        all_done = True
        for lid, sid, lnum, title, doc, nbid in target_lectures:
            if not nbid:
                continue
            sub_name = "تدريس مصغر" if sid == 3 else "تكنولوجيا والتحول الرقمي"

            with SessionLocal() as db:
                types = {a.asset_type for a in db.query(MediaAsset.asset_type).filter(MediaAsset.lecture_id == lid).all()}

            has_audio = "audio" in types
            has_video = "video" in types

            if has_audio and has_video:
                continue

            all_done = False

            code, out = await run_cmd_async(["notebooklm", "artifact", "list", "-n", nbid, "--json"])
            if code != 0 or not out:
                continue

            try:
                data = json.loads(out)
                artifacts = data.get("artifacts", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            except Exception:
                continue

            # Audio
            if not has_audio:
                audio_art = next((a for a in artifacts if str(a.get("type", "")).lower() == "audio" and str(a.get("status", "")).lower() == "completed"), None)
                if audio_art:
                    logger.info(f"🎵 Found completed Audio for {sub_name} Lec {lnum}! Downloading...")
                    dest_a = temp_media_dir / f"audio_{lid}.m4a"
                    await run_cmd_async(["notebooklm", "download", "audio", str(dest_a), "--force", "-n", nbid])
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
                        logger.info(f"✅ Audio attached to {sub_name} Lec {lnum}")
                        dest_a.unlink(missing_ok=True)
                else:
                    # If audio is failed or missing, retry
                    failed_audio = next((a for a in artifacts if str(a.get("type", "")).lower() == "audio" and str(a.get("status", "")).lower() == "failed"), None)
                    if failed_audio:
                        pfile = ROOT / "prompts" / f"{sub_name}.txt"
                        p_str = str(pfile) if pfile.exists() else None
                        logger.info(f"🔄 Retrying failed audio for {sub_name} Lec {lnum}...")
                        await trigger_audio_overview(nbid, p_str)

            # Video
            if not has_video:
                video_art = next((a for a in artifacts if str(a.get("type", "")).lower() == "video" and str(a.get("status", "")).lower() == "completed"), None)
                if video_art:
                    logger.info(f"🎬 Found completed Video for {sub_name} Lec {lnum}! Downloading...")
                    dest_v = temp_media_dir / f"video_{lid}.mp4"
                    await run_cmd_async(["notebooklm", "download", "video", str(dest_v), "--force", "-n", nbid])
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
                        logger.info(f"✅ Video attached to {sub_name} Lec {lnum}")
                        dest_v.unlink(missing_ok=True)

        if all_done:
            logger.info("🏆 ALL 17 LECTURES ARE 100% COMPLETE WITH ALL MEDIA ASSETS!")
            break

        logger.info(f"⏳ Sync cycle {cycle}/40 complete. Sleeping 45s...")
        await asyncio.sleep(45)

    shutil.rmtree(temp_media_dir, ignore_errors=True)

async def main():
    total_lectures = len(DIGITAL_TASKS)
    prompt_path = str(PROMPT_DIGITAL) if PROMPT_DIGITAL.exists() else None

    logger.info("=" * 80)
    logger.info("🚀 INITIALIZING UNIFIED NIGHT ORCHESTRATOR")
    logger.info(f"   Task: 6 Lectures of '{SUBJECT_DIGITAL}' + Complete Reconciliation of all 17 Lectures")
    logger.info("=" * 80)

    completed_notebooks = []

    # =========================================================================
    # PHASE 1: SEQUENTIAL ACADEMIC FAST-TRACK FOR 'تكنولوجيا والتحول الرقمي'
    # =========================================================================
    for idx, task in enumerate(DIGITAL_TASKS, 1):
        try:
            lec_id, nb_id = await process_single_lecture_core(
                task, idx, total_lectures, SUBJECT_DIGITAL, DOCTOR_DIGITAL, PROMPT_DIGITAL
            )
            completed_notebooks.append((lec_id, nb_id, task))
            logger.info("⏳ Spacing cooldown 10s before next lecture...")
            await asyncio.sleep(10)
        except Exception as e:
            logger.exception(f"❌ Error processing {SUBJECT_DIGITAL} Lec {task['lecture_num']}: {e}")

    logger.info("=" * 80)
    logger.info(f"🎉 PHASE 1 COMPLETE: All {len(completed_notebooks)} digital transformation lectures are LIVE!")
    logger.info("=" * 80)

    # Monitored IDs for rate limiter
    all_nb_ids = [nb_id for _, nb_id, _ in completed_notebooks]

    # =========================================================================
    # PHASE 2: RATE-LIMITED MEDIA ENGINE FOR 'تكنولوجيا والتحول الرقمي'
    # =========================================================================
    logger.info("=" * 80)
    logger.info("🎬 PHASE 2: LAUNCHING RATE-LIMITED MEDIA (ONE VIDEO AT A TIME)")
    logger.info("=" * 80)

    for idx, (lec_id, nb_id, task) in enumerate(completed_notebooks, 1):
        try:
            logger.info(f"[{idx}/{len(completed_notebooks)}] Triggering Media for Lec {task['lecture_num']} ({nb_id})...")
            # 1. Audio
            await trigger_audio_overview(nb_id, prompt_path)
            # 2. Video with rate limit check & cooldown
            await safe_trigger_video(nb_id, prompt_path, all_nb_ids)
        except Exception as me:
            logger.exception(f"⚠️ Error triggering media for lecture {task['lecture_num']}: {me}")

    # =========================================================================
    # PHASE 3: GLOBAL RECONCILIATION FOR ALL 17 LECTURES
    # =========================================================================
    await reconcile_all_17_lectures()

    logger.info("=" * 80)
    logger.info("🌟 UNIFIED NIGHT ORCHESTRATION 100% COMPLETE FOR ALL 17 LECTURES!")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
