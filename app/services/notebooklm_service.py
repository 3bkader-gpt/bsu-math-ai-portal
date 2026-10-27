import asyncio
import json
import logging
import os
import re
import subprocess
import sys
import shutil
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from app.config import settings
from app.db.models import Lecture, MediaAsset
from app.services.telegram_storage import telegram_storage

from app.services.notebooklm_client import run_notebooklm_cmd, run_notebooklm_cmd_async

logger = logging.getLogger("notebooklm_pipeline")

# Maintain backward compatibility for existing pipeline references
run_cmd = run_notebooklm_cmd
run_cmd_async = run_notebooklm_cmd_async

def make_telegram_caption(subject_name: str, lecture_num: int, title: str, doctor: str | None, asset_label: str, filename: str = "") -> str:
    """Formats structured, readable captions for Telegram storage channel."""
    doc_str = f" | 👨‍🏫 {doctor}" if doctor else ""
    tag_sub = subject_name.replace(" ", "_")
    file_info = f" ({filename})" if filename else ""
    return (
        f"📚 #{tag_sub}{doc_str}\n"
        f"📌 المحاضرة {lecture_num}: {title}\n"
        f"✨ {asset_label}{file_info}\n"
        f"🎓 كلية التربية - قسم الرياضيات | جامعة بني سويف"
    )

class NotebookLMPipeline:

    @staticmethod
    async def create_notebook(title: str) -> str:
        """Creates a new notebook and returns its UUID."""
        cmd = ["notebooklm", "create", title, "-u", "--json"]
        code, out = await run_cmd_async(cmd)
        if code == 0:
            try:
                data = json.loads(out)
                nb_id = (
                    data.get("id")
                    or data.get("notebook_id")
                    or data.get("active_notebook_id")
                    or (data.get("notebook", {}).get("id") if isinstance(data.get("notebook"), dict) else None)
                )
                if nb_id:
                    return nb_id
            except Exception:
                pass
        # Fallback regex extraction if json flag wasn't parsed
        uuid_match = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", out, re.I)
        if uuid_match:
            return uuid_match.group(1)
        raise RuntimeError(f"Failed to create notebook. Output: {out}")

    @staticmethod
    async def add_source(notebook_id: str, file_path: Path):
        """Adds a PDF file to the notebook."""
        cmd = ["notebooklm", "source", "add", str(file_path), "-n", notebook_id]
        code, out = await run_cmd_async(cmd)
        if code != 0:
            raise RuntimeError(f"Failed to add source {file_path.name}: {out}")

    @classmethod
    async def process_lecture_pipeline(
        cls,
        lecture_id: int,
        subject_name: str,
        lecture_num: int,
        pdf_paths: list[Path],
        prompt_path: str | None,
        db_factory,
        doctor: str | None = None
    ):
        """
        End-to-End Orchestrator for Lecture Pipeline:
        1. Creates Notebook
        2. Uploads PDFs
        3. Generates Quiz, Study Guide, Flashcards, Mind Map, Audio
        4. Downloads artifacts
        5. Uploads to Telegram Storage Backend
        6. Updates DB Status
        """
        temp_dir = settings.MEDIA_DIR / "temp" / f"lec_{lecture_id}_{uuid.uuid4().hex[:8]}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        db: Session = db_factory()
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if not lecture:
            logger.error(f"Lecture {lecture_id} not found in database.")
            return

        try:
            # 1. Start processing
            lecture.status = "processing"
            lecture.stage_info = "جاري إنشاء الدفتر ورفع المصادر..."
            db.commit()

            doc_suffix = f" ({doctor})" if doctor else ""
            notebook_title = f"{subject_name}{doc_suffix} - المحاضرة {lecture_num}"
            nb_id = await cls.create_notebook(notebook_title)
            lecture.notebook_id = nb_id
            db.commit()


            # 2. Add sources
            for pdf in pdf_paths:
                await cls.add_source(nb_id, pdf)
                # Store original PDF asset with clean structured caption
                cap = make_telegram_caption(subject_name, lecture_num, lecture.title, doctor, "📄 ملف المحاضرة المعتمد", pdf.name)
                upload_res = await telegram_storage.upload_asset(pdf, "pdf", cap)
                db.add(MediaAsset(
                    lecture_id=lecture.id,
                    asset_type="original_pdf",
                    title=pdf.name,
                    local_file_path=upload_res.get("local_file_path"),
                    telegram_file_id=upload_res.get("telegram_file_id"),
                    telegram_message_id=upload_res.get("telegram_message_id"),
                    file_size_bytes=upload_res.get("file_size")
                ))
            db.commit()

            # 3. Trigger Audio Overview early (can take ~3-5 mins in Google's cloud)
            lecture.stage_info = "جاري إطلاق توليد الشرح الصوتي والمخرجات الأكاديمية..."
            db.commit()

            audio_cmd = ["notebooklm", "generate", "audio", "--length", "long", "-n", nb_id]
            if prompt_path and Path(prompt_path).exists():
                audio_cmd.extend(["--prompt-file", prompt_path])
            else:
                audio_cmd.extend(["اشرح المحاضرة بالتفصيل وباللهجة المصرية وركز على القوانين وخطوات الحل"])
            # Launch audio asynchronously with retry
            await run_cmd_async(audio_cmd)
            await asyncio.sleep(15)  # Spacing cooldown before requesting video

            # Launch explainer video generation with rate-limit retry and backoff
            video_cmd = ["notebooklm", "generate", "video", "--format", "explainer", "--retry", "3", "-n", nb_id]
            if prompt_path and Path(prompt_path).exists():
                video_cmd.extend(["--prompt-file", prompt_path])
            else:
                video_cmd.extend(["فيديو تعليمي تفاعلي يشرح القوانين والمسائل خطوة بخطوة بالعامية المصرية"])
            await run_cmd_async(video_cmd)

            # 4. Trigger Text Generations with --wait for completion
            lecture.stage_info = "جاري توليد الكويز والملخص والبطاقات الذكية..."
            db.commit()
            db.close()

            quiz_cmd = ["notebooklm", "generate", "quiz", "اختبار شامل مع تلميحات وشرح الإجابات", "--quantity", "more", "--wait", "--retry", "3", "-n", nb_id]
            report_cmd = ["notebooklm", "generate", "report", "--format", "study-guide", "--wait", "--retry", "3", "-n", nb_id]
            cards_cmd = ["notebooklm", "generate", "flashcards", "أهم المفاهيم والقوانين والتعريفات", "--quantity", "more", "--retry", "3", "-n", nb_id]
            map_cmd = ["notebooklm", "generate", "mind-map", "--kind", "note-backed", "-n", nb_id]

            await asyncio.gather(
                run_cmd_async(quiz_cmd),
                run_cmd_async(report_cmd),
                run_cmd_async(cards_cmd),
                run_cmd_async(map_cmd)
            )

            # 5. Wait for and Download Artifacts
            db = db_factory()
            lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            if lecture:
                lecture.stage_info = "جاري تحميل وتخزين المخرجات..."
                db.commit()

            # Download Quiz
            quiz_file = temp_dir / "quiz.md"
            await run_cmd_async(["notebooklm", "download", "quiz", "--format", "markdown", str(quiz_file), "--force", "-n", nb_id])
            if quiz_file.exists():
                txt = quiz_file.read_text(encoding="utf-8", errors="replace")
                cap = make_telegram_caption(subject_name, lecture_num, lecture.title, doctor, "📝 كويز تفاعلي وبنك الأسئلة الكامل")
                res = await telegram_storage.upload_asset(quiz_file, "quiz_md", cap)
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="quiz_md", title="كويز المحاضرة",
                    content_text=txt,
                    local_file_path=res.get("local_file_path"), telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"), file_size_bytes=res.get("file_size")
                ))

            # Download Study Guide
            report_file = temp_dir / "study_guide.md"
            await run_cmd_async(["notebooklm", "download", "report", str(report_file), "--force", "-n", nb_id])
            if report_file.exists():
                txt = report_file.read_text(encoding="utf-8", errors="replace")
                cap = make_telegram_caption(subject_name, lecture_num, lecture.title, doctor, "📄 ملخص ودليل دراسي شامل وتأسيسي")
                res = await telegram_storage.upload_asset(report_file, "study_guide_md", cap)
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="study_guide_md", title="دليل دراسي وملخص",
                    content_text=txt,
                    local_file_path=res.get("local_file_path"), telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"), file_size_bytes=res.get("file_size")
                ))

            # Download Flashcards
            cards_file = temp_dir / "flashcards.md"
            await run_cmd_async(["notebooklm", "download", "flashcards", "--format", "markdown", str(cards_file), "--force", "-n", nb_id])
            if cards_file.exists():
                txt = cards_file.read_text(encoding="utf-8", errors="replace")
                cap = make_telegram_caption(subject_name, lecture_num, lecture.title, doctor, "🃏 بطاقات استذكار ذكية (Flashcards)")
                res = await telegram_storage.upload_asset(cards_file, "flashcards_md", cap)
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="flashcards_md", title="بطاقات تعليمية",
                    content_text=txt,
                    local_file_path=res.get("local_file_path"), telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"), file_size_bytes=res.get("file_size")
                ))

            # Download Mind Map
            map_file = temp_dir / "mind_map.json"
            await run_cmd_async(["notebooklm", "download", "mind-map", str(map_file), "--force", "-n", nb_id])
            if map_file.exists():
                txt = map_file.read_text(encoding="utf-8", errors="replace")
                cap = make_telegram_caption(subject_name, lecture_num, lecture.title, doctor, "🧠 خريطة ذهنية ومفاهيمية (Mind Map)")
                res = await telegram_storage.upload_asset(map_file, "mind_map_json", cap)
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="mind_map_json", title="خريطة ذهنية",
                    content_text=txt,
                    local_file_path=res.get("local_file_path"), telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"), file_size_bytes=res.get("file_size")
                ))

            # 5. Fast Completion: Mark lecture ready for students immediately!
            # Text assets (Quiz, Study Guide, Flashcards, Mind Map) are ready in ~30s
            lecture.status = "completed"
            lecture.stage_info = "المحاضرة جاهزة ومتاحة للمذاكرة والكويزات ✅ (جاري تجهيز البودكاست الصوتي في الخلفية 🎧)"
            db.commit()

            # 6. Decoupled Media Fetcher: Let audio/video finish at its own pace in the background
            asyncio.create_task(
                cls.fetch_media_in_background(
                    lecture_id=lecture.id,
                    nb_id=nb_id or "",
                    subject_name=subject_name,
                    temp_dir=temp_dir,
                    db_factory=db_factory
                )
            )

        except Exception as e:
            logger.exception("Pipeline failed")
            shutil.rmtree(temp_dir, ignore_errors=True)
            try:
                db.rollback()
            except Exception:
                pass
            try:
                with db_factory() as err_db:
                    lec = err_db.query(Lecture).filter(Lecture.id == lecture_id).first()
                    if lec:
                        lec.status = "failed"
                        lec.stage_info = "فشلت المعالجة"
                        lec.error_message = str(e)
                        err_db.commit()
            except Exception as dbe:
                logger.error(f"Failed to record failure in DB: {dbe}")
        finally:
            try:
                db.close()
            except Exception:
                pass

    @classmethod
    async def fetch_media_in_background(
        cls,
        lecture_id: int,
        nb_id: str,
        subject_name: str,
        temp_dir: Path,
        db_factory
    ):
        """
        Background worker running independently without blocking the lecture or user:
        Polls NotebookLM until audio and video finish generating in Google's cloud,
        then automatically downloads, uploads to Telegram, and attaches to the lecture.
        """
        logger.info(f"Started decoupled background media fetcher for lecture {lecture_id} (Notebook {nb_id})")
        audio_file = temp_dir / "audio_overview.m4a"
        video_file = temp_dir / "video_overview.mp4"

        try:
            # Check initial media presence to avoid redundant downloads if already attached
            with db_factory() as check_db:
                has_audio_init = check_db.query(MediaAsset).filter(
                    MediaAsset.lecture_id == lecture_id,
                    MediaAsset.asset_type == "audio"
                ).first() is not None
                has_video_init = check_db.query(MediaAsset).filter(
                    MediaAsset.lecture_id == lecture_id,
                    MediaAsset.asset_type == "video"
                ).first() is not None

            audio_completed = has_audio_init
            video_completed = has_video_init

            if audio_completed and video_completed:
                logger.info(f"Both audio and video are already present for lecture {lecture_id}. No polling needed.")
                return

            # Check every 15s for up to 60 iterations (15 minutes total timeout)
            for attempt in range(60):
                await asyncio.sleep(15)
                try:
                    # 1. Attempt to download audio if not yet attached
                    if not audio_completed:
                        if not (audio_file.exists() and audio_file.stat().st_size > 1000):
                            c, _ = await run_cmd_async(["notebooklm", "download", "audio", str(audio_file), "--force", "-n", nb_id])
                        if audio_file.exists() and audio_file.stat().st_size > 1000:
                            db = db_factory()
                            try:
                                existing_audio = db.query(MediaAsset).filter(
                                    MediaAsset.lecture_id == lecture_id,
                                    MediaAsset.asset_type == "audio"
                                ).first()

                                if not existing_audio:
                                    res = await telegram_storage.upload_asset(audio_file, "audio", f"🎧 بودكاست المحاضرة - {subject_name}")
                                    db.add(MediaAsset(
                                        lecture_id=lecture_id,
                                        asset_type="audio",
                                        title="بودكاست الشرح الصوتي",
                                        local_file_path=res.get("local_file_path"),
                                        telegram_file_id=res.get("telegram_file_id"),
                                        telegram_message_id=res.get("telegram_message_id"),
                                        file_size_bytes=res.get("file_size")
                                    ))
                                    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
                                    if lec:
                                        lec.stage_info = "اكتمل الشرح الصوتي بنجاح وجاري متابعة الفيديو 🎬"
                                    db.commit()
                                    logger.info(f"Successfully attached audio to lecture {lecture_id}!")
                                audio_completed = True
                            finally:
                                db.close()

                    # 2. Attempt to download video if not yet attached
                    if not video_completed:
                        if not (video_file.exists() and video_file.stat().st_size > 1000):
                            vc, _ = await run_cmd_async(["notebooklm", "download", "video", str(video_file), "--force", "-n", nb_id])
                        if video_file.exists() and video_file.stat().st_size > 1000:
                            db = db_factory()
                            try:
                                existing_vid = db.query(MediaAsset).filter(
                                    MediaAsset.lecture_id == lecture_id,
                                    MediaAsset.asset_type == "video"
                                ).first()
                                if not existing_vid:
                                    res_v = await telegram_storage.upload_asset(video_file, "video", f"🎬 فيديو المحاضرة - {subject_name}")
                                    db.add(MediaAsset(
                                        lecture_id=lecture_id,
                                        asset_type="video",
                                        title="فيديو الشرح التفاعلي",
                                        local_file_path=res_v.get("local_file_path"),
                                        telegram_file_id=res_v.get("telegram_file_id"),
                                        telegram_message_id=res_v.get("telegram_message_id"),
                                        file_size_bytes=res_v.get("file_size")
                                    ))
                                    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
                                    if lec:
                                        lec.stage_info = "اكتملت جميع المخرجات والشرح الصوتي والمرئي بنجاح ✅"
                                    db.commit()
                                    logger.info(f"Successfully attached video to lecture {lecture_id}!")
                                video_completed = True
                            finally:
                                db.close()

                    # Completion Condition: Terminate early ONLY when BOTH audio and video are retrieved!
                    if audio_completed and video_completed:
                        logger.info(f"Both audio and video successfully fetched for lecture {lecture_id}.")
                        break

                except Exception as e:
                    logger.warning(f"Background media fetch attempt {attempt+1} encountered: {e}")

        finally:
            logger.info(f"Background media fetcher finished for lecture {lecture_id}")
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.info(f"Auto-purged temp directory for lecture {lecture_id} (0 bytes left on local disk).")
            except Exception:
                pass


    @classmethod
    async def sync_lecture_media(cls, lecture_id: int, db: Session) -> dict:
        """
        On-demand fetch: Checks if NotebookLM cloud finished generating audio or video,
        and immediately attaches them to the lecture if ready.
        """
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if not lecture or not lecture.notebook_id:
            return {"status": "no_notebook"}

        temp_dir = settings.MEDIA_DIR / "temp" / f"sync_lec_{lecture_id}_{uuid.uuid4().hex[:8]}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        nb_id = lecture.notebook_id or ""
        subject_name = lecture.subject.name if lecture.subject else ""

        try:
            # Check audio
            has_audio = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "audio").first()
            if not has_audio:
                audio_file = temp_dir / "audio_overview.m4a"
                c, _ = await run_cmd_async(["notebooklm", "download", "audio", str(audio_file), "--force", "-n", nb_id])
                if c == 0 and audio_file.exists() and audio_file.stat().st_size > 1000:
                    cap_audio = make_telegram_caption(subject_name, lecture.lecture_num, lecture.title, lecture.doctor, "🎧 بودكاست الشرح الصوتي بالمصرية")
                    res = await telegram_storage.upload_asset(audio_file, "audio", cap_audio)
                    db.add(MediaAsset(
                        lecture_id=lecture.id, asset_type="audio", title="بودكاست الشرح الصوتي",
                        local_file_path=res.get("local_file_path"), telegram_file_id=res.get("telegram_file_id"),
                        telegram_message_id=res.get("telegram_message_id"), file_size_bytes=res.get("file_size")
                    ))
                    lecture.stage_info = "اكتملت جميع المخرجات والشرح الصوتي بنجاح ✅"
                    db.commit()

            # Check video
            has_video = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "video").first()
            if not has_video:
                video_file = temp_dir / "video_overview.mp4"
                vc, _ = await run_cmd_async(["notebooklm", "download", "video", str(video_file), "--force", "-n", nb_id])
                if vc == 0 and video_file.exists() and video_file.stat().st_size > 1000:
                    cap_video = make_telegram_caption(subject_name, lecture.lecture_num, lecture.title, lecture.doctor, "🎬 فيديو الشرح المرئي التفاعلي")
                    res_v = await telegram_storage.upload_asset(video_file, "video", cap_video)
                    db.add(MediaAsset(
                        lecture_id=lecture.id, asset_type="video", title="فيديو الشرح التفاعلي",
                        local_file_path=res_v.get("local_file_path"), telegram_file_id=res_v.get("telegram_file_id"),
                        telegram_message_id=res_v.get("telegram_message_id"), file_size_bytes=res_v.get("file_size")
                    ))
                    db.commit()

            return {"ok": True}
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)



