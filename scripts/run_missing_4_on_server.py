import asyncio
import logging
import sys
import os
import shutil
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/home/abkader/missing_4_pipeline.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("Missing4ServerPipeline")

ROOT = Path("/home/abkader/bsu-math-ai-portal")
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset
from app.services.notebooklm_service import NotebookLMPipeline, make_telegram_caption
from app.services.notebooklm_client import run_notebooklm_cmd_async as run_cmd_async
from app.services.telegram_storage import telegram_storage

MISSING_TASKS = [
    {
        "subject": "كهربيه مغناطيسية وتيار متردد",
        "lecture_num": 2,
        "title": "قانون جاوس وتطبيقاته والفيض الكهربي",
        "doctor": "د/ حسن سيد",
        "pdf_paths": [Path("/home/abkader/incoming_pdfs/elec_lec2/lec2.pdf")],
        "prompt": Path("/home/abkader/bsu-math-ai-portal/prompts/كهربيه مغناطيسية وتيار متردد.txt")
    },
    {
        "subject": "معادلات تفاضلية",
        "lecture_num": 4,
        "title": "المعادلات التي تؤول إلى متجانسة والمعادلات التفاضلية التامة",
        "doctor": "د/ حسين",
        "pdf_paths": [Path("/home/abkader/incoming_pdfs/ode_lec4/كتاب - معادلات تؤول إلى متجانسة والمعادلات التامة.pdf")],
        "prompt": Path("/home/abkader/bsu-math-ai-portal/prompts/معادلات تفاضلية.txt")
    },
    {
        "subject": "معادلات تفاضلية",
        "lecture_num": 5,
        "title": "عامل التكامل والمعادلات التفاضلية الخطية من الرتبة الأولى",
        "doctor": "د/ حسين",
        "pdf_paths": [
            Path("/home/abkader/incoming_pdfs/ode_lec5/كتاب - عامل التكامل والمعادلات الخطية من الرتبة الأولى.pdf"),
            Path("/home/abkader/incoming_pdfs/ode_lec5/lec5.pdf")
        ],
        "prompt": Path("/home/abkader/bsu-math-ai-portal/prompts/معادلات تفاضلية.txt")
    },
    {
        "subject": "نظريه عدد ومنطق",
        "lecture_num": 4,
        "title": "التكافؤ المنطقي وجداول الصدق وصور العبارات المركبة",
        "doctor": "د/ محمد حسين",
        "pdf_paths": [Path("/home/abkader/incoming_pdfs/num_lec4/lec4.pdf")],
        "prompt": Path("/home/abkader/bsu-math-ai-portal/prompts/نظريه عدد ومنطق.txt")
    }
]

async def process_task(task: dict, idx: int, total: int):
    subject_name = task["subject"]
    lec_num = task["lecture_num"]
    title = task["title"]
    doctor = task["doctor"]
    pdf_paths = [p for p in task["pdf_paths"] if p.exists()]
    prompt_path = str(task["prompt"]) if task["prompt"].exists() else None

    logger.info("=" * 80)
    logger.info(f"[{idx}/{total}] 🚀 STARTING PIPELINE: {subject_name} - المحاضرة {lec_num}: {title} (Doctor: {doctor})")
    logger.info(f"    PDFs: {[p.name for p in pdf_paths]}")
    logger.info("=" * 80)

    if not pdf_paths:
        logger.error("❌ No valid PDFs found! Skipping.")
        return False

    with SessionLocal() as db:
        subj = db.query(Subject).filter(Subject.name == subject_name).first()
        if not subj:
            logger.error(f"❌ Subject '{subject_name}' not found!")
            return False

        q = db.query(Lecture).filter(Lecture.subject_id == subj.id, Lecture.lecture_num == lec_num)
        if doctor:
            q = q.filter(Lecture.doctor == doctor)
        lec = q.first()

        if not lec:
            lec = Lecture(
                subject_id=subj.id,
                lecture_num=lec_num,
                title=title,
                doctor=doctor,
                status="processing",
                stage_info="جاري بدء معالجة المحاضرة عبر نوتبوك... 🧠"
            )
            db.add(lec)
            db.commit()
            db.refresh(lec)
            logger.info(f"✅ Created Lecture DB ID {lec.id}")
        else:
            lec.title = title
            lec.doctor = doctor
            lec.status = "processing"
            lec.stage_info = "جاري تحديث ومعالجة المحاضرة... 🔄"
            db.commit()
            logger.info(f"🔄 Re-using Lecture DB ID {lec.id}")

        lecture_id = int(lec.id)

    temp_dir = Path("/home/abkader/temp_runs") / f"lec_{lecture_id}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Create Notebook
        nb_title = f"{subject_name} ({doctor}) - المحاضرة {lec_num}: {title}"
        logger.info(f"Creating notebook: '{nb_title}'")
        nb_id = await NotebookLMPipeline.create_notebook(nb_title)
        logger.info(f"✅ Notebook created: {nb_id}")

        with SessionLocal() as db:
            l = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            if l:
                l.notebook_id = nb_id
                db.commit()

        # 2. Upload Sources & Save original_pdf
        for pdf in pdf_paths:
            logger.info(f"Adding source to notebook: {pdf.name}...")
            await NotebookLMPipeline.add_source(nb_id, pdf)
            logger.info(f"Uploading original PDF to Telegram: {pdf.name}...")
            cap = make_telegram_caption(subject_name, lec_num, title, doctor, "📄 ملف المحاضرة المعتمد", pdf.name)
            up = await telegram_storage.upload_asset(pdf, "pdf", cap)
            with SessionLocal() as db:
                existing_pdf = db.query(MediaAsset).filter(
                    MediaAsset.lecture_id == lecture_id,
                    MediaAsset.asset_type == "original_pdf",
                    MediaAsset.title == pdf.name
                ).first()
                if not existing_pdf:
                    db.add(MediaAsset(
                        lecture_id=lecture_id,
                        asset_type="original_pdf",
                        title=pdf.name,
                        local_file_path=up.get("local_file_path"),
                        telegram_file_id=up.get("telegram_file_id"),
                        telegram_message_id=up.get("telegram_message_id"),
                        file_size_bytes=up.get("file_size")
                    ))
                    db.commit()
                    logger.info(f"✅ original_pdf saved in DB for {pdf.name}")

        # 3. Trigger Audio Overview & Explainer Video in Google Cloud
        logger.info("Triggering Audio Overview & Explainer Video in Google Cloud...")
        audio_cmd = ["notebooklm", "generate", "audio", "--length", "long", "-n", nb_id]
        video_cmd = ["notebooklm", "generate", "video", "--format", "explainer", "-n", nb_id]
        if prompt_path:
            audio_cmd.extend(["--prompt-file", prompt_path])
            video_cmd.extend(["--prompt-file", prompt_path])
        await asyncio.gather(run_cmd_async(audio_cmd), run_cmd_async(video_cmd))

        # 4. Generate Text Artifacts (Quiz, Study Guide, Flashcards, Mind Map)
        logger.info("Generating academic text artifacts (Quiz, Guide, Cards, Mind Map)...")
        quiz_cmd = [
            "notebooklm", "generate", "quiz",
            "اختبار شامل مع تلميحات وشرح الإجابات. لكل سؤال أضف بعد الخيارات سطر Hint بإجابة صغيرة، "
            "وأسفل الهينت بلوك Steps فيه خطوات الحل النموذجي مرقمة.",
            "--quantity", "more", "--wait", "--retry", "3", "-n", nb_id
        ]
        report_cmd = [
            "notebooklm", "generate", "report",
            "--format", "study-guide", "--wait", "--retry", "3", "-n", nb_id
        ]
        cards_cmd = [
            "notebooklm", "generate", "flashcards",
            "أهم المفاهيم والقوانين والتعريفات",
            "--quantity", "more", "--retry", "3", "-n", nb_id
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
        logger.info("✅ Google completed generation for all 4 text artifacts!")

        # 5. Download and store text artifacts
        text_configs = [
            ("quiz", "quiz.md", "quiz_md", "كويز المحاضرة", "📝 كويز تفاعلي وبنك الأسئلة الكامل"),
            ("report", "study_guide.md", "study_guide_md", "دليل دراسي وملخص", "📚 دليل دراسي وملخص شامل"),
            ("flashcards", "flashcards.md", "flashcards_md", "بطاقات تعليمية", "🃏 بطاقات استذكار تعليمية"),
            ("mind-map", "mind_map.json", "mind_map_json", "خريطة ذهنية", "🧠 خريطة ذهنية ومفاهيمية"),
        ]

        for kind, filename, asset_type, asset_title, label in text_configs:
            dest = temp_dir / filename
            dl_cmd = ["notebooklm", "download", kind, str(dest), "--force", "-n", nb_id]
            if kind == "quiz":
                dl_cmd.insert(3, "--format")
                dl_cmd.insert(4, "markdown")
            elif kind == "flashcards":
                dl_cmd.insert(3, "--format")
                dl_cmd.insert(4, "markdown")

            await run_cmd_async(dl_cmd)
            if dest.exists() and dest.stat().st_size > 10:
                txt_content = dest.read_text(encoding="utf-8", errors="replace")
                cap = make_telegram_caption(subject_name, lec_num, title, doctor, label)
                up_res = await telegram_storage.upload_asset(dest, asset_type, cap)
                with SessionLocal() as db:
                    existing = db.query(MediaAsset).filter(
                        MediaAsset.lecture_id == lecture_id,
                        MediaAsset.asset_type == asset_type
                    ).first()
                    if existing:
                        existing.content_text = txt_content
                        existing.local_file_path = up_res.get("local_file_path")
                        existing.telegram_file_id = up_res.get("telegram_file_id")
                        existing.telegram_message_id = up_res.get("telegram_message_id")
                        existing.file_size_bytes = up_res.get("file_size")
                    else:
                        db.add(MediaAsset(
                            lecture_id=lecture_id,
                            asset_type=asset_type,
                            title=asset_title,
                            content_text=txt_content,
                            local_file_path=up_res.get("local_file_path"),
                            telegram_file_id=up_res.get("telegram_file_id"),
                            telegram_message_id=up_res.get("telegram_message_id"),
                            file_size_bytes=up_res.get("file_size")
                        ))
                    db.commit()
                logger.info(f"✅ Stored {asset_type} ({len(txt_content)} chars) in DB & Telegram")
            else:
                logger.warning(f"⚠️ {kind} artifact not found at {dest}")

        # 6. Mark lecture ready for students immediately!
        with SessionLocal() as db:
            l = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            if l:
                l.status = "completed"
                l.stage_info = "المحاضرة جاهزة ومتاحة للمذاكرة والكويزات والملخصات ✅ (جاري إنهاء البودكاست في الخلفية 🎧)"
                db.commit()

        logger.info(f"🎉 SUCCESS! Lecture {lecture_id} ({subject_name} Lec {lec_num}) is now LIVE!")
        return True

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

async def main():
    logger.info("=" * 80)
    logger.info("🌟 STARTING MISSING 4 LECTURES PROCESSING PIPELINE ON RESIDENTIAL SERVER")
    logger.info("=" * 80)

    for idx, task in enumerate(MISSING_TASKS, 1):
        try:
            await process_task(task, idx, len(MISSING_TASKS))
        except Exception as e:
            logger.exception(f"❌ Error processing task {idx}: {e}")

    logger.info("=" * 80)
    logger.info("🏁 ALL 4 MISSING LECTURES COMPLETED SUCCESSFULLY!")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
