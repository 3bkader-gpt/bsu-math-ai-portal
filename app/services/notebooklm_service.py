import asyncio
import json
import logging
import re
import subprocess
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.models import Lecture, MediaAsset
from app.services.telegram_storage import telegram_storage

logger = logging.getLogger("notebooklm_pipeline")

def run_cmd(args: list[str]) -> tuple[int, str]:
    """Helper to run synchronous subprocess command cleanly."""
    try:
        proc = subprocess.run(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        return proc.returncode, proc.stdout
    except Exception as e:
        return 1, str(e)

async def run_cmd_async(args: list[str]) -> tuple[int, str]:
    """Asynchronous wrapper around subprocess execution."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, run_cmd, args)

class NotebookLMPipeline:

    @staticmethod
    async def create_notebook(title: str) -> str:
        """Creates a new notebook and returns its UUID."""
        cmd = ["notebooklm", "create", title, "-u", "--json"]
        code, out = await run_cmd_async(cmd)
        if code == 0:
            try:
                data = json.loads(out)
                return data.get("id") or data.get("notebook_id")
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
        temp_dir = Path(r"D:\الكليه\BOT\media_storage\temp") / f"lec_{lecture_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        db: Session = db_factory()
        lecture: Lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

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
                # Store original PDF asset
                upload_res = await telegram_storage.upload_asset(pdf, "pdf", f"📄 المحاضرة الأصلية - {subject_name} ({pdf.name})")
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
            # Launch audio asynchronously without waiting so text artifacts can generate concurrently
            await run_cmd_async(audio_cmd)

            # 4. Trigger Text Generations with --wait for completion
            lecture.stage_info = "جاري توليد الكويز والملخص والبطاقات الذكية..."
            db.commit()

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
            lecture.stage_info = "جاري تحميل وتخزين المخرجات..."
            db.commit()

            # Download Quiz
            quiz_file = temp_dir / "quiz.md"
            await run_cmd_async(["notebooklm", "download", "quiz", "--format", "markdown", str(quiz_file), "--force", "-n", nb_id])
            if quiz_file.exists():
                res = await telegram_storage.upload_asset(quiz_file, "quiz_md", f"📝 كويز المحاضرة - {subject_name}")
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="quiz_md", title="كويز المحاضرة",
                    local_file_path=res.get("local_file_path"), telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"), file_size_bytes=res.get("file_size")
                ))

            # Download Study Guide
            report_file = temp_dir / "study_guide.md"
            await run_cmd_async(["notebooklm", "download", "report", str(report_file), "--force", "-n", nb_id])
            if report_file.exists():
                res = await telegram_storage.upload_asset(report_file, "study_guide_md", f"📄 ملخص ودليل دراسي - {subject_name}")
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="study_guide_md", title="دليل دراسي وملخص",
                    local_file_path=res.get("local_file_path"), telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"), file_size_bytes=res.get("file_size")
                ))

            # Download Flashcards
            cards_file = temp_dir / "flashcards.md"
            await run_cmd_async(["notebooklm", "download", "flashcards", "--format", "markdown", str(cards_file), "--force", "-n", nb_id])
            if cards_file.exists():
                res = await telegram_storage.upload_asset(cards_file, "flashcards_md", f"🃏 بطاقات تعليمية - {subject_name}")
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="flashcards_md", title="بطاقات تعليمية",
                    local_file_path=res.get("local_file_path"), telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"), file_size_bytes=res.get("file_size")
                ))

            # Download Mind Map
            map_file = temp_dir / "mind_map.json"
            await run_cmd_async(["notebooklm", "download", "mind-map", str(map_file), "--force", "-n", nb_id])
            if map_file.exists():
                res = await telegram_storage.upload_asset(map_file, "mind_map_json", f"🧠 خريطة ذهنية - {subject_name}")
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="mind_map_json", title="خريطة ذهنية",
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
                    nb_id=nb_id,
                    subject_name=subject_name,
                    temp_dir=temp_dir,
                    db_factory=db_factory
                )
            )

        except Exception as e:

            logger.exception("Pipeline failed")
            lecture.status = "failed"
            lecture.stage_info = "فشلت المعالجة"
            lecture.error_message = str(e)
            db.commit()
        finally:
            db.close()

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
        Polls NotebookLM until audio (and video) finish generating in Google's cloud,
        then automatically downloads, uploads to Telegram, and attaches to the lecture.
        """
        logger.info(f"Started decoupled background media fetcher for lecture {lecture_id} (Notebook {nb_id})")
        audio_file = temp_dir / "audio_overview.m4a"
        video_file = temp_dir / "video_overview.mp4"

        # Check every 15s for up to 60 iterations (15 minutes total)
        for attempt in range(60):
            await asyncio.sleep(15)
            try:
                # 1. Attempt to download audio
                if not (audio_file.exists() and audio_file.stat().st_size > 1000):
                    c, _ = await run_cmd_async(["notebooklm", "download", "audio", str(audio_file), "--force", "-n", nb_id])
                    if c == 0 and audio_file.exists() and audio_file.stat().st_size > 1000:
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
                                    lec.stage_info = "اكتملت جميع المخرجات والشرح الصوتي بنجاح ✅"
                                db.commit()
                                logger.info(f"Successfully attached audio to lecture {lecture_id}!")
                        finally:
                            db.close()

                # 2. Attempt to download video if available
                if not (video_file.exists() and video_file.stat().st_size > 1000):
                    vc, _ = await run_cmd_async(["notebooklm", "download", "video", str(video_file), "--force", "-n", nb_id])
                    if vc == 0 and video_file.exists() and video_file.stat().st_size > 1000:
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
                                db.commit()
                                logger.info(f"Successfully attached video to lecture {lecture_id}!")
                        finally:
                            db.close()

                # If both audio is fetched, we are completely done
                if audio_file.exists() and audio_file.stat().st_size > 1000:
                    break

            except Exception as e:
                logger.warning(f"Background media fetch attempt {attempt+1} encountered: {e}")

        logger.info(f"Background media fetcher finished for lecture {lecture_id}")

    @classmethod
    async def sync_lecture_media(cls, lecture_id: int, db: Session) -> dict:
        """
        On-demand fetch: Checks if NotebookLM cloud finished generating audio or video,
        and immediately attaches them to the lecture if ready.
        """
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if not lecture or not lecture.notebook_id:
            return {"status": "no_notebook"}

        temp_dir = Path(r"D:\الكليه\BOT\media_storage\temp") / f"lec_{lecture_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        nb_id = lecture.notebook_id
        subject_name = lecture.subject.name

        # Check audio
        has_audio = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "audio").first()
        if not has_audio:
            audio_file = temp_dir / "audio_overview.m4a"
            c, _ = await run_cmd_async(["notebooklm", "download", "audio", str(audio_file), "--force", "-n", nb_id])
            if c == 0 and audio_file.exists() and audio_file.stat().st_size > 1000:
                res = await telegram_storage.upload_asset(audio_file, "audio", f"🎧 بودكاست المحاضرة - {subject_name}")
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
                res_v = await telegram_storage.upload_asset(video_file, "video", f"🎬 فيديو المحاضرة - {subject_name}")
                db.add(MediaAsset(
                    lecture_id=lecture.id, asset_type="video", title="فيديو الشرح التفاعلي",
                    local_file_path=res_v.get("local_file_path"), telegram_file_id=res_v.get("telegram_file_id"),
                    telegram_message_id=res_v.get("telegram_message_id"), file_size_bytes=res_v.get("file_size")
                ))
                db.commit()

        return {"ok": True}


