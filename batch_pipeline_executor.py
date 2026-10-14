import asyncio
import logging
import sys
from pathlib import Path

# UTF-8 stdout configuration for Windows
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(r"D:\الكليه\BOT\batch_pipeline.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("BatchPipeline")

from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset
from app.services.notebooklm_service import NotebookLMPipeline, run_cmd_async, make_telegram_caption
from app.services.telegram_storage import telegram_storage

CURRICULUM_QUEUE = [
    # 1. فلسفة وتاريخ رياضيات
    {
        "subject": "فلسفه وتاريخ رياضيات",
        "lecture_num": 2,
        "title": "تاريخ الرياضيات وأنظمة العد القديمة",
        "doctor": "د/ طه ابراهيم",
        "folder": Path(r"D:\الكليه\subjects\فلسفه وتاريخ رياضيات\lec2"),
        "files": ["lec2.pdf", "كتاب - تاريخ الرياضيات وأنظمة العد القديمة.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\فلسفه وتاريخ رياضيات\prompt.txt")
    },
    {
        "subject": "فلسفه وتاريخ رياضيات",
        "lecture_num": 3,
        "title": "الحساب والعمليات الرياضية في الحضارة المصرية القديمة",
        "doctor": "د/ طه ابراهيم",
        "folder": Path(r"D:\الكليه\subjects\فلسفه وتاريخ رياضيات\lec3"),
        "files": ["lec3.pdf", "كتاب - الحساب والعمليات الرياضية والكسور في الحضارة المصرية القديمة.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\فلسفه وتاريخ رياضيات\prompt.txt")
    },
    # 2. ديناميكا 2
    {
        "subject": "ديناميكا 2",
        "lecture_num": 1,
        "title": "مقدمة في الديناميكا وتفاضل المتجهات",
        "doctor": "د/ مروة ذكري",
        "folder": Path(r"D:\الكليه\subjects\ديناميكا 2\lec1"),
        "files": ["lec1.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\ديناميكا 2\prompt.txt")
    },
    {
        "subject": "ديناميكا 2",
        "lecture_num": 2,
        "title": "حركة الجسيم في خط مستقيم والمسار المنحني",
        "doctor": "د/ مروة ذكري",
        "folder": Path(r"D:\الكليه\subjects\ديناميكا 2\lec2"),
        "files": ["lec2.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\ديناميكا 2\prompt.txt")
    },
    # 3. نظرية عدد ومنطق
    {
        "subject": "نظريه عدد ومنطق",
        "lecture_num": 1,
        "title": "مبادئ المنطق الرياضي وجداول الصدق",
        "doctor": "د/ محمد حسين",
        "folder": Path(r"D:\الكليه\subjects\نظريه عدد ومنطق\lec1"),
        "files": ["lec1.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\نظريه عدد ومنطق\prompt.txt")
    },
    {
        "subject": "نظريه عدد ومنطق",
        "lecture_num": 2,
        "title": "قابلية القسمة وخوارزمية إقليدس",
        "doctor": "د/ محمد حسين",
        "folder": Path(r"D:\الكليه\subjects\نظريه عدد ومنطق\lec2"),
        "files": ["lec2.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\نظريه عدد ومنطق\prompt.txt")
    },
    # 4. تعليم وريادة أعمال
    {
        "subject": "تعليم ورياده اعمال",
        "lecture_num": 1,
        "title": "أساسيات ريادة الأعمال وإدارة المشروعات",
        "doctor": "د/ وليد",
        "folder": Path(r"D:\الكليه\subjects\تعليم ورياده اعمال\دكتور وليد (ريادة الأعمال)\lec1"),
        "files": ["lec1.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\تعليم ورياده اعمال\prompt.txt")
    },
    {
        "subject": "تعليم ورياده اعمال",
        "lecture_num": 1,
        "title": "التربية المعاصرة ودور المعلم الريادي",
        "doctor": "د/ مروة",
        "folder": Path(r"D:\الكليه\subjects\تعليم ورياده اعمال\دكتورة مروة (التربية)\lec1"),
        "files": ["lec1.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\تعليم ورياده اعمال\prompt.txt")
    },
    # 5. استاتيكا 2
    {
        "subject": "استاتيكا2",
        "lecture_num": 1,
        "title": "اتزان الأجسام الصلبة والازدواجات",
        "doctor": "د/ ايه",
        "folder": Path(r"D:\الكليه\subjects\استاتيكا2\lec1"),
        "files": ["lec1.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\استاتيكا2\prompt.txt")
    },
    # 6. إدارة معرفة
    {
        "subject": "اداره معرفه",
        "lecture_num": 1,
        "title": "مدخل إلى إدارة المعرفة ورأس المال الفكري",
        "doctor": "د/ عزام",
        "folder": Path(r"D:\الكليه\subjects\اداره معرفه\lec1"),
        "files": ["lec1.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\اداره معرفه\prompt.txt")
    },
    # 7. كهربية مغناطيسية وتيار متردد
    {
        "subject": "كهربيه مغناطيسية وتيار متردد",
        "lecture_num": 1,
        "title": "قانون كولوم والمجال الكهربي",
        "doctor": "د/ حسن سيد",
        "folder": Path(r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\lec1"),
        "files": ["lec1.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\كهربيه مغناطيسية وتيار متردد\prompt.txt")
    },
    # 8. معادلات تفاضلية
    {
        "subject": "معادلات تفاضلية",
        "lecture_num": 1,
        "title": "المعادلات التفاضلية من الرتبة الأولى وطرق حلها",
        "doctor": "د/ حسين",
        "folder": Path(r"D:\الكليه\subjects\معادلات تفاضلية\lec1"),
        "files": ["lec1.pdf"],
        "prompt": Path(r"D:\الكليه\subjects\معادلات تفاضلية\prompt.txt")
    }
]

async def process_single_task(task_info: dict, index: int, total: int):
    subject_name = task_info["subject"]
    lec_num = task_info["lecture_num"]
    title = task_info["title"]
    doctor = task_info["doctor"]
    folder = task_info["folder"]
    prompt_path = str(task_info["prompt"]) if task_info["prompt"].exists() else None
    
    logger.info("=" * 80)
    logger.info(f"[{index}/{total}] STARTING: {subject_name} - المحاضرة {lec_num}: {title} (Doctor: {doctor or 'General'})")
    logger.info("=" * 80)

    # Resolve PDF files
    pdf_paths = []
    for f in task_info["files"]:
        p = folder / f
        if p.exists():
            pdf_paths.append(p)
        else:
            logger.warning(f"File {p} not found, searching folder {folder}...")
            for alt in folder.glob("*.pdf"):
                if alt not in pdf_paths:
                    pdf_paths.append(alt)

    if not pdf_paths:
        logger.error(f"No PDFs found in {folder}! Skipping this lecture.")
        return False

    # Check existing DB record and skip if already 100% completed with audio
    lecture_id = None
    with SessionLocal() as db:
        subject = db.query(Subject).filter(Subject.name == subject_name).first()
        if not subject:
            logger.error(f"Subject '{subject_name}' not found in DB! Skipping.")
            return False

        q = db.query(Lecture).filter(Lecture.subject_id == subject.id, Lecture.lecture_num == lec_num)
        if doctor:
            q = q.filter(Lecture.doctor == doctor)
        else:
            q = q.filter(Lecture.doctor.is_(None))
        lecture = q.first()

        if lecture and lecture.status == "completed":
            has_audio = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture.id, MediaAsset.asset_type == "audio").first()
            if has_audio:
                logger.info(f"Lecture {lecture.id} is already 100% completed with audio. Skipping to next.")
                return True

        if not lecture:
            lecture = Lecture(
                subject_id=subject.id,
                lecture_num=lec_num,
                title=title,
                doctor=doctor,
                status="queued",
                stage_info="جاري الإدراج في خط الإنتاج الآلي..."
            )
            db.add(lecture)
            db.commit()
            db.refresh(lecture)
            logger.info(f"Created new Lecture DB record: ID {lecture.id}")
        else:
            lecture.title = title
            lecture.doctor = doctor
            lecture.status = "queued"
            lecture.stage_info = "جاري إعادة المعالجة في خط الإنتاج الآلي..."
            db.commit()
            logger.info(f"Updating existing Lecture DB record: ID {lecture.id}")

        lecture_id = int(lecture.id)

    # Execute core pipeline: Notebook creation, PDF upload, Audio trigger, Text generation
    logger.info(f"Launching NotebookLMPipeline for Lecture ID {lecture_id}...")
    await NotebookLMPipeline.process_lecture_pipeline(
        lecture_id=lecture_id,
        subject_name=subject_name,
        lecture_num=lec_num,
        pdf_paths=pdf_paths,
        prompt_path=prompt_path,
        db_factory=SessionLocal,
        doctor=doctor
    )
    logger.info(f"Core pipeline completed (sources & text artifacts uploaded) for Lecture {lecture_id}.")

    # Generate interactive Mind Map
    temp_dir = Path(r"D:\الكليه\BOT\media_storage\temp") / f"lec_{lecture_id}"
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    nb_id = ""
    with SessionLocal() as db:
        lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        nb_id = str(lec.notebook_id or "") if lec else ""
        has_map = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "mind_map_json").first()
    
    if not has_map and nb_id:
        logger.info(f"Generating mind-map for notebook {nb_id}...")
        await run_cmd_async(["notebooklm", "generate", "mind-map", "-n", nb_id])
        map_file = temp_dir / "mind_map.json"
        await run_cmd_async(["notebooklm", "download", "mind-map", str(map_file), "--force", "-n", nb_id])
        if map_file.exists():
            cap = make_telegram_caption(subject_name, lec_num, title, doctor, "🧠 خريطة ذهنية ومفاهيمية (Mind Map)")
            res_m = await telegram_storage.upload_asset(map_file, "mind_map_json", cap)
            with SessionLocal() as db:
                db.add(MediaAsset(
                    lecture_id=lecture_id,
                    asset_type="mind_map_json",
                    title="خريطة ذهنية",
                    local_file_path=res_m.get("local_file_path"),
                    telegram_file_id=res_m.get("telegram_file_id"),
                    telegram_message_id=res_m.get("telegram_message_id"),
                    file_size_bytes=res_m.get("file_size")
                ))
                db.commit()
            logger.info(f"Mind map attached to Telegram & DB for Lecture {lecture_id}.")

    # Poll for Audio generation to complete in Google's cloud
    logger.info(f"Polling NotebookLM for completed audio overview for notebook {nb_id}...")
    audio_file = temp_dir / "audio_overview.m4a"
    audio_attached = False

    for attempt in range(1, 31):
        with SessionLocal() as db:
            has_audio = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "audio").first()
            if has_audio:
                audio_attached = True
                break

        c, out = await run_cmd_async(["notebooklm", "download", "audio", str(audio_file), "--force", "-n", nb_id])
        if c == 0 and audio_file.exists() and audio_file.stat().st_size > 1000:
            logger.info(f"Audio downloaded successfully ({audio_file.stat().st_size} bytes). Uploading to Telegram CDN...")
            cap_audio = make_telegram_caption(subject_name, lec_num, title, doctor, "🎧 بودكاست الشرح الصوتي بالمصرية")
            res_a = await telegram_storage.upload_asset(audio_file, "audio", cap_audio)
            with SessionLocal() as db:
                db.add(MediaAsset(
                    lecture_id=lecture_id,
                    asset_type="audio",
                    title="بودكاست الشرح الصوتي",
                    local_file_path=res_a.get("local_file_path"),
                    telegram_file_id=res_a.get("telegram_file_id"),
                    telegram_message_id=res_a.get("telegram_message_id"),
                    file_size_bytes=res_a.get("file_size")
                ))
                lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
                if lec:
                    lec.stage_info = "اكتملت جميع المخرجات والشرح الصوتي بنجاح ✅"
                db.commit()
            logger.info(f"Audio successfully uploaded to Telegram and saved in DB for Lecture {lecture_id}!")
            audio_attached = True
            break
        else:
            logger.info(f"Audio generation still in progress (attempt {attempt}/30)... waiting 20s.")
            await asyncio.sleep(20)

    # Check for completed video overview
    with SessionLocal() as db:
        has_video = db.query(MediaAsset).filter(MediaAsset.lecture_id == lecture_id, MediaAsset.asset_type == "video").first()
    
    if not has_video and nb_id:
        video_file = temp_dir / "video_overview.mp4"
        vc, _ = await run_cmd_async(["notebooklm", "download", "video", str(video_file), "--force", "-n", nb_id])
        if vc == 0 and video_file.exists() and video_file.stat().st_size > 1000:
            logger.info(f"Video downloaded successfully ({video_file.stat().st_size} bytes). Uploading to Telegram...")
            cap_video = make_telegram_caption(subject_name, lec_num, title, doctor, "🎬 فيديو الشرح المرئي التفاعلي")
            res_v = await telegram_storage.upload_asset(video_file, "video", cap_video)
            with SessionLocal() as db:
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
            logger.info(f"Video attached to Telegram & DB for Lecture {lecture_id}!")

    # Mark final status
    with SessionLocal() as db:
        lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if lec:
            lec.status = "completed"
            if audio_attached:
                lec.stage_info = "المحاضرة مكتملة 100% بجميع ملفاتها والشرح الصوتي ✅"
            else:
                lec.stage_info = "المحاضرة جاهزة ومتاحة للمذاكرة والكويزات ✅ (جاري إنهاء الصوت في الخلفية)"
            db.commit()

    logger.info(f"[{index}/{total}] FINISHED: {subject_name} - المحاضرة {lec_num}: {title} ✅")
    return True

async def main():
    total = len(CURRICULUM_QUEUE)
    logger.info(f"Starting Resilient Batch Pipeline Execution for {total} lectures...")
    
    success_count = 0
    for idx, task in enumerate(CURRICULUM_QUEUE, start=1):
        try:
            ok = await process_single_task(task, idx, total)
            if ok:
                success_count += 1
        except Exception as e:
            logger.exception(f"Unhandled error in task {idx}: {e}")
        
        logger.info("Cooling down 10 seconds before next lecture...")
        await asyncio.sleep(10)

    logger.info("=" * 80)
    logger.info(f"BATCH EXECUTION COMPLETE! Successfully processed {success_count}/{total} lectures.")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
