import asyncio
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("FinishAndReconcile4")

ROOT = Path("/home/abkader/bsu-math-ai-portal")
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.database import SessionLocal
from app.db.models import Lecture, MediaAsset
from app.services.notebooklm_client import run_notebooklm_cmd_async as run_cmd_async
from app.services.notebooklm_service import make_telegram_caption
from app.services.telegram_storage import telegram_storage

TEMP_DIR = Path("/home/abkader/temp_reconcile")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

async def attach_flashcards(lecture_id: int, nb_id: str, subject_name: str, lec_num: int, title: str, doctor: str):
    logger.info(f"Downloading flashcards for Lec {lecture_id} ({nb_id})...")
    fc_file = TEMP_DIR / f"lec_{lecture_id}_cards.md"
    cmd = ["notebooklm", "download", "flashcards", "--format", "markdown", "--force", "-n", nb_id, str(fc_file)]
    c, out = await run_cmd_async(cmd)
    if fc_file.exists() and fc_file.stat().st_size > 50:
        content = fc_file.read_text(encoding="utf-8", errors="replace")
        cap = make_telegram_caption(subject_name, lec_num, title, doctor, "🃏 بطاقات استذكار تعليمية (Flashcards)")
        res = await telegram_storage.upload_asset(fc_file, "flashcards_md", cap)
        with SessionLocal() as db:
            existing = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "flashcards_md").first()
            if existing:
                existing.content_text = content
                existing.telegram_file_id = res.get("telegram_file_id")
                existing.telegram_message_id = res.get("telegram_message_id")
                existing.file_size_bytes = res.get("file_size")
            else:
                db.add(MediaAsset(
                    lecture_id=lecture_id,
                    asset_type="flashcards_md",
                    title="بطاقات تعليمية",
                    content_text=content,
                    local_file_path=res.get("local_file_path"),
                    telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"),
                    file_size_bytes=res.get("file_size")
                ))
            db.commit()
        logger.info(f"✅ Flashcards saved for Lecture {lecture_id}!")
    else:
        logger.error(f"❌ Failed to download flashcards for Lecture {lecture_id}: {out}")

async def process_lecture_44():
    lecture_id = 44
    nb_id = "cfd98979-78c5-43df-af35-4ad87ddcdc72"
    subject_name = "معادلات تفاضلية"
    lec_num = 4
    title = "المعادلات التي تؤول إلى متجانسة والمعادلات التفاضلية التامة"
    doctor = "د/ حسين"
    prompt_file = ROOT / "prompts" / "معادلات تفاضلية.txt"
    prompt_path = str(prompt_file) if prompt_file.exists() else None

    logger.info("=" * 80)
    logger.info(f"Processing missing artifacts for Lecture 44 ({title})...")
    logger.info("=" * 80)

    # 1. Trigger audio & video
    audio_cmd = ["notebooklm", "generate", "audio", "--length", "long", "-n", nb_id]
    video_cmd = ["notebooklm", "generate", "video", "--format", "explainer", "-n", nb_id]
    if prompt_path:
        audio_cmd.extend(["--prompt-file", prompt_path])
        video_cmd.extend(["--prompt-file", prompt_path])
    await asyncio.gather(run_cmd_async(audio_cmd), run_cmd_async(video_cmd))

    # 2. Generate text artifacts sequentially with wait
    logger.info("Generating Quiz for Lec 44...")
    await run_cmd_async(["notebooklm", "generate", "quiz", "اختبار شامل مع تلميحات وشرح الإجابات", "--quantity", "more", "--wait", "--retry", "3", "-n", nb_id])
    
    logger.info("Generating Study Guide for Lec 44...")
    await run_cmd_async(["notebooklm", "generate", "report", "--format", "study-guide", "--wait", "--retry", "3", "-n", nb_id])

    logger.info("Generating Flashcards for Lec 44...")
    await run_cmd_async(["notebooklm", "generate", "flashcards", "أهم المفاهيم والقوانين والتعريفات", "--quantity", "more", "--retry", "3", "-n", nb_id])

    logger.info("Generating Mind Map for Lec 44...")
    await run_cmd_async(["notebooklm", "generate", "mind-map", "--kind", "note-backed", "-n", nb_id])

    # 3. Download and upload all 4 artifacts
    artifacts_to_dl = [
        ("quiz", "quiz.md", "quiz_md", "كويز المحاضرة", "📝 كويز تفاعلي وبنك الأسئلة الكامل"),
        ("report", "study_guide.md", "study_guide_md", "دليل دراسي وملخص", "📚 دليل دراسي وملخص شامل"),
        ("flashcards", "flashcards.md", "flashcards_md", "بطاقات تعليمية", "🃏 بطاقات استذكار تعليمية"),
        ("mind-map", "mind_map.json", "mind_map_json", "خريطة ذهنية", "🧠 خريطة ذهنية ومفاهيمية"),
    ]

    for kind, fname, asset_type, asset_title, label in artifacts_to_dl:
        dest = TEMP_DIR / f"lec_44_{fname}"
        cmd = ["notebooklm", "download", kind, "--force", "-n", nb_id]
        if kind in ("quiz", "flashcards"):
            cmd.extend(["--format", "markdown"])
        cmd.append(str(dest))

        logger.info(f"Downloading {kind} to {dest}...")
        await run_cmd_async(cmd)
        if dest.exists() and dest.stat().st_size > 10:
            content = dest.read_text(encoding="utf-8", errors="replace")
            cap = make_telegram_caption(subject_name, lec_num, title, doctor, label)
            up = await telegram_storage.upload_asset(dest, asset_type, cap)
            with SessionLocal() as db:
                existing = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == asset_type).first()
                if existing:
                    existing.content_text = content
                    existing.telegram_file_id = up.get("telegram_file_id")
                    existing.telegram_message_id = up.get("telegram_message_id")
                    existing.file_size_bytes = up.get("file_size")
                else:
                    db.add(MediaAsset(
                        lecture_id=lecture_id,
                        asset_type=asset_type,
                        title=asset_title,
                        content_text=content,
                        local_file_path=up.get("local_file_path"),
                        telegram_file_id=up.get("telegram_file_id"),
                        telegram_message_id=up.get("telegram_message_id"),
                        file_size_bytes=up.get("file_size")
                    ))
                db.commit()
            logger.info(f"✅ Stored {asset_type} for Lecture 44!")
        else:
            logger.warning(f"⚠️ Could not download {kind} for Lecture 44")

async def main():
    logger.info("Reconciling flashcards for Lec 43 and Lec 45...")
    await attach_flashcards(43, "fcea46cf-8f75-4419-8c15-da3f79c40538", "كهربيه مغناطيسية وتيار متردد", 2, "قانون جاوس وتطبيقاته والفيض الكهربي", "د/ حسن سيد")
    await attach_flashcards(45, "f44af2b7-f99c-4888-a292-af9f08bb0c8e", "معادلات تفاضلية", 5, "عامل التكامل والمعادلات التفاضلية الخطية من الرتبة الأولى", "د/ حسين")
    logger.info("Processing Lecture 44 full artifacts...")
    await process_lecture_44()
    logger.info("🎉 RECONCILIATION COMPLETE!")

if __name__ == "__main__":
    asyncio.run(main())
