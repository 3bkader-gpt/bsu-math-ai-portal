import argparse
import asyncio
import logging
import os
import shutil
import sys
import time
from pathlib import Path

# UTF-8 stdout configuration
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger("CloudLectureExecutor")

import httpx
from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset
from app.services.notebooklm_service import NotebookLMPipeline, run_cmd_async, make_telegram_caption
from app.services.telegram_storage import telegram_storage

PROMPTS_DIR = Path(__file__).parent / "prompts"

def db_execute_with_retry(fn, max_retries=3, delay=3):
    """Executes a database function with auto-reconnect retry on Supabase pooler drop."""
    for attempt in range(1, max_retries + 1):
        try:
            with SessionLocal() as db:
                return fn(db)
        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Database operation failed permanently after {max_retries} attempts: {e}")
                raise
            logger.warning(f"Database retry {attempt}/{max_retries} due to: {e}. Sleeping {delay}s...")
            time.sleep(delay)

async def download_file_from_url(url: str, dest_path: Path):
    """Downloads a PDF from a direct URL or Telegram file URL."""
    logger.info(f"Downloading PDF from: {url}")
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        with open(dest_path, "wb") as f:
            f.write(resp.content)
    logger.info(f"Downloaded {dest_path.stat().st_size} bytes to {dest_path}")

async def run_pipeline(
    subject_name: str,
    lecture_num: int,
    title: str | None,
    doctor: str | None,
    pdf_path: Path | None,
    pdf_url: str | None,
    telegram_notify_chat_id: str | None = None
):
    temp_dir = Path("temp_cloud_run") / f"sub_{int(time.time())}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Resolve PDF file
        local_pdf = None
        if pdf_path and pdf_path.exists():
            local_pdf = pdf_path
        elif pdf_url:
            local_pdf = temp_dir / f"lecture_{lecture_num}.pdf"
            await download_file_from_url(pdf_url, local_pdf)
        else:
            raise ValueError("Either --pdf-path or --pdf-url must be provided and valid!")

        # 2. Resolve Prompt
        prompt_file = PROMPTS_DIR / f"{subject_name}.txt"
        prompt_path_str = str(prompt_file) if prompt_file.exists() else None
        if not prompt_path_str:
            logger.warning(f"No specific prompt found at {prompt_file}, using default pedagogy instructions.")

        actual_title = title.strip() if title and title.strip() else f"المحاضرة {lecture_num}"

        # 3. Create or Get Lecture in Supabase
        def _get_or_create(db):
            subj = db.query(Subject).filter(Subject.name == subject_name).first()
            if not subj:
                subj = Subject(name=subject_name, folder_path="", prompt_path=prompt_path_str)
                db.add(subj)
                db.commit()
                db.refresh(subj)
            
            q = db.query(Lecture).filter(Lecture.subject_id == subj.id, Lecture.lecture_num == lecture_num)
            if doctor:
                q = q.filter(Lecture.doctor == doctor)
            lec = q.first()

            if not lec:
                lec = Lecture(
                    subject_id=subj.id,
                    lecture_num=lecture_num,
                    title=actual_title,
                    doctor=doctor,
                    status="queued",
                    stage_info="جاري الإدراج في خط الإنتاج السحابي الذكي..."
                )
                db.add(lec)
                db.commit()
                db.refresh(lec)
            else:
                lec.title = actual_title
                lec.doctor = doctor
                lec.status = "queued"
                lec.stage_info = "جاري إعادة المعالجة في خط الإنتاج السحابي..."
                db.commit()
            return int(lec.id)

        lecture_id = db_execute_with_retry(_get_or_create)
        logger.info(f"Target Lecture DB ID: {lecture_id} ({subject_name} - {actual_title})")

        # 4. Execute Core Pipeline (Notebook creation, PDF upload, Quiz, Guide, Cards, Mind Map)
        logger.info(f"Starting NotebookLMPipeline for Lecture {lecture_id}...")
        await NotebookLMPipeline.process_lecture_pipeline(
            lecture_id=lecture_id,
            subject_name=subject_name,
            lecture_num=lecture_num,
            pdf_paths=[local_pdf],
            prompt_path=prompt_path_str,
            db_factory=SessionLocal,
            doctor=doctor
        )
        logger.info(f"Core artifacts generated successfully for Lecture {lecture_id}!")

        # 5. Retrieve Notebook ID
        def _get_nb_id(db):
            l = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            return str(l.notebook_id or "") if l else ""
        nb_id = db_execute_with_retry(_get_nb_id)

        # 6. Ensure Mind Map is uploaded
        def _check_map(db):
            return db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "mind_map_json").first() is not None
        has_map = db_execute_with_retry(_check_map)

        if not has_map and nb_id:
            logger.info("Generating and attaching mind map...")
            await run_cmd_async(["notebooklm", "generate", "mind-map", "-n", nb_id])
            map_file = temp_dir / "mind_map.json"
            await run_cmd_async(["notebooklm", "download", "mind-map", str(map_file), "--force", "-n", nb_id])
            if map_file.exists():
                cap = make_telegram_caption(subject_name, lecture_num, actual_title, doctor, "🧠 خريطة ذهنية ومفاهيمية (Mind Map)")
                res_m = await telegram_storage.upload_asset(map_file, "mind_map_json", cap)
                txt_map = map_file.read_text(encoding="utf-8", errors="replace")
                def _save_map(db):
                    db.add(MediaAsset(
                        lecture_id=lecture_id,
                        asset_type="mind_map_json",
                        title="خريطة ذهنية",
                        content_text=txt_map,
                        local_file_path=res_m.get("local_file_path"),
                        telegram_file_id=res_m.get("telegram_file_id"),
                        telegram_message_id=res_m.get("telegram_message_id"),
                        file_size_bytes=res_m.get("file_size")
                    ))
                    db.commit()
                db_execute_with_retry(_save_map)

        # 7. Poll for Audio Overview (Egyptian Arabic)
        logger.info(f"Polling for Egyptian Arabic audio podcast (Notebook {nb_id})...")
        audio_file = temp_dir / "audio_overview.m4a"
        audio_attached = False

        for attempt in range(1, 31):
            def _check_audio(db):
                return db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "audio").first() is not None
            if db_execute_with_retry(_check_audio):
                audio_attached = True
                break

            c, _ = await run_cmd_async(["notebooklm", "download", "audio", str(audio_file), "--force", "-n", nb_id])
            if c == 0 and audio_file.exists() and audio_file.stat().st_size > 1000:
                logger.info(f"Audio downloaded ({audio_file.stat().st_size} bytes). Uploading to Telegram CDN...")
                cap_audio = make_telegram_caption(subject_name, lecture_num, actual_title, doctor, "🎧 بودكاست الشرح الصوتي بالمصرية")
                res_a = await telegram_storage.upload_asset(audio_file, "audio", cap_audio)
                
                def _save_audio(db):
                    db.add(MediaAsset(
                        lecture_id=lecture_id,
                        asset_type="audio",
                        title="بودكاست الشرح الصوتي",
                        local_file_path=res_a.get("local_file_path"),
                        telegram_file_id=res_a.get("telegram_file_id"),
                        telegram_message_id=res_a.get("telegram_message_id"),
                        file_size_bytes=res_a.get("file_size")
                    ))
                    l = db.query(Lecture).filter(Lecture.id == lecture_id).first()
                    if l:
                        l.stage_info = "اكتملت جميع المخرجات والشرح الصوتي بنجاح ✅"
                    db.commit()
                db_execute_with_retry(_save_audio)
                audio_attached = True
                break
            else:
                logger.info(f"Audio generating in Google cloud (attempt {attempt}/30)... waiting 20s.")
                await asyncio.sleep(20)

        # 8. Check for Video
        def _check_video(db):
            return db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "video").first() is not None
        has_vid = db_execute_with_retry(_check_video)

        if not has_vid and nb_id:
            video_file = temp_dir / "video_overview.mp4"
            vc, _ = await run_cmd_async(["notebooklm", "download", "video", str(video_file), "--force", "-n", nb_id])
            if vc == 0 and video_file.exists() and video_file.stat().st_size > 1000:
                logger.info(f"Video downloaded ({video_file.stat().st_size} bytes). Uploading to Telegram...")
                cap_video = make_telegram_caption(subject_name, lecture_num, actual_title, doctor, "🎬 فيديو الشرح المرئي التفاعلي")
                res_v = await telegram_storage.upload_asset(video_file, "video", cap_video)
                def _save_vid(db):
                    db.add(MediaAsset(
                        lecture_id=lecture_id,
                        asset_type="video",
                        title="فيديو الشرح التفاعلي",
                        local_file_path=res_v.get("local_file_path"),
                        telegram_file_id=res_v.get("telegram_file_id"),
                        telegram_message_id=res_v.get("telegram_message_id"),
                        file_size_bytes=res_v.get("file_size")
                    ))
                    db.commit()
                db_execute_with_retry(_save_vid)

        # 9. Mark Lecture as Completed
        def _mark_complete(db):
            l = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            if l:
                l.status = "completed"
                if audio_attached:
                    l.stage_info = "المحاضرة مكتملة 100% بجميع ملفاتها والشرح الصوتي ✅"
                else:
                    l.stage_info = "المحاضرة جاهزة ومتاحة للمذاكرة والكويزات ✅ (جاري إنهاء الصوت في الخلفية)"
                db.commit()
        db_execute_with_retry(_mark_complete)

        # 10. Optional Telegram notification
        if telegram_notify_chat_id and telegram_storage.is_configured:
            notify_text = (
                f"🎉 **تم الانتهاء بنجاح من معالجة المحاضرة سحابياً!**\n\n"
                f"📚 **المادة:** {subject_name}\n"
                f"📌 **المحاضرة:** {lecture_num} - {actual_title}\n"
                f"👨‍🏫 **الدكتور:** {doctor or 'عام'}\n"
                f"✨ أصبحت متاحة فوراً لجميع الطلاب على المنصة!\n"
                f"🔗 https://bsu-math-ai-portal.pages.dev"
            )
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        f"{telegram_storage.api_base}/sendMessage",
                        json={"chat_id": telegram_notify_chat_id, "text": notify_text, "parse_mode": "Markdown"}
                    )
            except Exception as ne:
                logger.warning(f"Could not send completion notification: {ne}")

        logger.info(f"SUCCESS: Pipeline completed for {subject_name} Lec {lecture_num}!")
        return True

    finally:
        # STRICT CLEANUP: 0 bytes left
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.info("Cleaned up temporary runner storage (0 bytes remaining).")
        except Exception as cle:
            logger.warning(f"Could not purge {temp_dir}: {cle}")

def main():
    parser = argparse.ArgumentParser(description="Cloud Automated Pipeline for Academic Lectures")
    parser.add_argument("--subject", required=True, help="Subject name in Arabic")
    parser.add_argument("--lecture-num", type=int, required=True, help="Lecture number")
    parser.add_argument("--title", default="", help="Lecture title")
    parser.add_argument("--doctor", default="", help="Doctor name")
    parser.add_argument("--pdf-path", default="", help="Path to local PDF file")
    parser.add_argument("--pdf-url", default="", help="URL to download PDF file")
    parser.add_argument("--notify-chat-id", default="", help="Telegram chat ID to notify on completion")

    args = parser.parse_args()

    pdf_p = Path(args.pdf_path) if args.pdf_path else None
    pdf_u = args.pdf_url if args.pdf_url else None
    doc = args.doctor.strip() if args.doctor else None
    tit = args.title.strip() if args.title else None
    chat_id = args.notify_chat_id.strip() if args.notify_chat_id else None

    asyncio.run(run_pipeline(
        subject_name=args.subject.strip(),
        lecture_num=args.lecture_num,
        title=tit,
        doctor=doc,
        pdf_path=pdf_p,
        pdf_url=pdf_u,
        telegram_notify_chat_id=chat_id
    ))

if __name__ == "__main__":
    main()
