import re
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db, SessionLocal
from app.db.models import Subject, Lecture, User
from app.services.notebooklm_service import NotebookLMPipeline
from app.services.prompt_service import get_subject_prompt
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["Lecture Uploader"])

MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB

@router.post("/upload")
async def upload_lecture(
    background_tasks: BackgroundTasks,
    subject_id: int = Form(...),
    lecture_num: int = Form(...),
    title: str = Form(None),
    doctor: str = Form(None),
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Receives lecture PDF(s), validates security constraints,
    registers the lecture in the database, and launches the AI processing pipeline.
    """
    if lecture_num < 1:
        raise HTTPException(status_code=400, detail="رقم المحاضرة يجب أن يكون 1 أو أكثر")

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="المادة غير موجودة")

    if not files:
        raise HTTPException(status_code=400, detail="يجب رفع ملف PDF واحد على الأقل")

    # Sanitize doctor track string to prevent path traversal
    clean_doctor = None
    if doctor and doctor.strip():
        sanitized = re.sub(r'[\\/*?:"<>|\.]+', ' ', doctor.strip()).strip()
        clean_doctor = sanitized if sanitized else None

    # Target folder in the subject directory (with doctor subfolder if provided)
    if clean_doctor:
        lec_folder = Path(subject.folder_path) / clean_doctor / f"lec{lecture_num}"
    else:
        lec_folder = Path(subject.folder_path) / f"lec{lecture_num}"
    lec_folder.mkdir(parents=True, exist_ok=True)

    saved_pdf_paths: list[Path] = []
    for f in files:
        # Strictly extract only the base filename to prevent path traversal
        raw_name = Path(f.filename or "lecture.pdf").name
        safe_name = re.sub(r'[\\/*?:"<>|]', '', raw_name)

        if not safe_name.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"الملف '{safe_name}' غير صالح. يُسمح فقط برفع ملفات PDF"
            )

        content = await f.read()

        if len(content) > MAX_PDF_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"حجم الملف '{safe_name}' كبير جداً. الحد الأقصى هو 50 ميجابايت"
            )

        if not content.startswith(b"%PDF"):
            raise HTTPException(
                status_code=400,
                detail=f"الملف '{safe_name}' ليس ملف PDF حقيقي صالح"
            )

        save_dest = lec_folder / safe_name
        with open(save_dest, "wb") as out_f:
            out_f.write(content)
        saved_pdf_paths.append(save_dest)

    # Check if lecture already exists for this subject and doctor track
    query = db.query(Lecture).filter(
        Lecture.subject_id == subject.id,
        Lecture.lecture_num == lecture_num
    )
    if clean_doctor:
        query = query.filter(Lecture.doctor == clean_doctor)
    else:
        query = query.filter(Lecture.doctor == None)

    existing_lecture = query.first()

    if existing_lecture:
        lecture = existing_lecture
        lecture.title = title.strip() if title and title.strip() else f"المحاضرة {lecture_num}"
        lecture.doctor = clean_doctor
        lecture.status = "queued"
        lecture.stage_info = "تم استلام المحاضرة المحدثة، جاري إعادة المعالجة"
        lecture.error_message = None
        # Remove old assets so they are cleanly regenerated
        for old_asset in lecture.assets:
            db.delete(old_asset)
        db.commit()
        db.refresh(lecture)
    else:
        # Register new lecture in DB
        lecture = Lecture(
            subject_id=subject.id,
            lecture_num=lecture_num,
            title=title.strip() if title and title.strip() else f"المحاضرة {lecture_num}",
            doctor=clean_doctor,
            status="queued",
            stage_info="تم استلام المحاضرة، جاري الإدراج في طابور المعالجة"
        )
        db.add(lecture)
        db.commit()
        db.refresh(lecture)

    # Get subject master prompt
    prompt_path = subject.prompt_path or get_subject_prompt(subject.name)

    # Launch background job
    background_tasks.add_task(
        NotebookLMPipeline.process_lecture_pipeline,
        lecture_id=lecture.id,
        subject_name=subject.name,
        lecture_num=lecture_num,
        pdf_paths=saved_pdf_paths,
        prompt_path=prompt_path,
        db_factory=SessionLocal,
        doctor=clean_doctor
    )

    return {
        "ok": True,
        "message": "تم استلام المحاضرة وجاري معالجتها بالكامل في الخلفية 🚀",
        "lecture_id": lecture.id,
        "status": lecture.status,
        "subject": subject.name,
        "doctor": clean_doctor,
        "lecture_num": lecture_num,
        "files_received": [p.name for p in saved_pdf_paths]
    }

