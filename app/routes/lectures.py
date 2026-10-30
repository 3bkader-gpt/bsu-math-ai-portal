from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, defer
from app.db.database import get_db
from app.db.models import Subject, Lecture, MediaAsset, User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["Lectures & Subjects"])

def get_subject_doctors(subject: Subject) -> list[str]:
    """Detects doctor/professor tracks for a subject from DB and filesystem."""
    doctors = set()
    for l in subject.lectures:
        if l.doctor:
            doctors.add(l.doctor)

    folder = Path(subject.folder_path)
    if folder.exists():
        for sub in folder.iterdir():
            if sub.is_dir() and (sub.name.startswith("دكتور") or sub.name.startswith("د.")):
                doctors.add(sub.name)

    return sorted(list(doctors))

@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db)):
    """Returns all subjects registered in the system with their doctor tracks and semester."""
    try:
        subjects = db.query(Subject).all()
        has_semester = True
    except Exception:
        db.rollback()
        subjects = db.query(Subject).options(defer(Subject.semester)).all()
        has_semester = False

    res = []
    for s in subjects:
        sem = 1
        if has_semester:
            try:
                sem = int(getattr(s, "semester", 1) or 1)
            except Exception:
                sem = 1
        res.append({
            "id": s.id,
            "name": s.name,
            "semester": sem,
            "has_prompt": bool(s.prompt_path),
            "lecture_count": len(s.lectures),
            "doctors": get_subject_doctors(s)
        })
    return res

@router.get("/subjects/{subject_id}/lectures")
def list_subject_lectures(
    subject_id: int,
    doctor: str | None = Query(None),
    db: Session = Depends(get_db)
):
    """Returns all lectures belonging to a specific subject, optionally filtered by doctor."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    query = db.query(Lecture).filter(Lecture.subject_id == subject_id)
    if doctor and doctor.strip() and doctor.strip() != "الكل":
        query = query.filter(Lecture.doctor == doctor.strip())

    lectures = query.order_by(Lecture.lecture_num.asc()).all()
    return [
        {
            "id": l.id,
            "lecture_num": l.lecture_num,
            "title": l.title,
            "doctor": l.doctor,
            "status": l.status,
            "stage_info": l.stage_info,
            "created_at": l.created_at,
            "assets_count": len(l.assets)
        }
        for l in lectures
    ]

from app.routes.stream import is_safe_path

class _RegisterBody:
    """Validated payload for the JWT-protected cloud lecture registration."""

    def __init__(self, payload: dict):
        from pydantic import BaseModel, Field, field_validator
        from app.config import settings

        class _Model(BaseModel):
            subject_id: int = Field(gt=0)
            lecture_num: int = Field(gt=0)
            title: str | None = None
            doctor: str | None = None
            source_pdf_url: str | None = None
            files: list[dict] | None = None

            @field_validator("source_pdf_url")
            @classmethod
            def validate_pdf_url(cls, value: str | None) -> str | None:
                if not value:
                    return value
                allowed_prefix = f"{settings.SUPABASE_URL}/storage/v1/object/public/lectures/"
                if not value.startswith(allowed_prefix):
                    raise ValueError("يجب أن يكون رابط الملف من مخزن المحاضرات الخاص بالمنصة")
                return value

        self._model = _Model(**payload)

    @property
    def subject_id(self): return self._model.subject_id
    @property
    def lecture_num(self): return self._model.lecture_num
    @property
    def title(self): return self._model.title
    @property
    def doctor(self): return self._model.doctor
    @property
    def source_pdf_url(self): return self._model.source_pdf_url
    @property
    def files(self): return self._model.files or []


@router.post("/lectures/register")
def register_cloud_lecture(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """JWT-protected lecture registration for the autonomous cloud pipeline.

    The dashboard uploads PDFs to Supabase Storage directly (browser ->
    Storage, no backend bandwidth) and then calls this endpoint with the
    public PDF URLs. Supports multiple files (slides + book + notes).
    """
    try:
        body = _RegisterBody(payload)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"بيانات المحاضرة غير صالحة: {exc}")

    subject = db.query(Subject).filter(Subject.id == body.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="المادة غير موجودة")

    clean_doctor = body.doctor.strip() if body.doctor and body.doctor.strip() else None
    clean_title = body.title.strip() if body.title and body.title.strip() else None

    primary_url = body.source_pdf_url
    if not primary_url and body.files:
        primary_url = body.files[0].get("url")

    if not primary_url:
        raise HTTPException(status_code=422, detail="يرجى توفير رابط ملف PDF واحد على الأقل")

    query = db.query(Lecture).filter(
        Lecture.subject_id == subject.id, Lecture.lecture_num == body.lecture_num
    )
    query = query.filter(Lecture.doctor == clean_doctor) if clean_doctor else query.filter(Lecture.doctor.is_(None))
    lecture = query.first()

    if lecture:
        lecture.title = clean_title or f"المحاضرة {body.lecture_num}"
        lecture.doctor = clean_doctor
        lecture.status = "queued"
        lecture.stage_info = "تم الرفع بنجاح، محرك المعالجة المنزلي هيلتقطها خلال ثوانٍ 🚀"
        lecture.source_pdf_url = primary_url
        lecture.error_message = None
        for old_asset in list(lecture.assets):
            db.delete(old_asset)
        db.flush()
    else:
        lecture = Lecture(
            subject_id=subject.id,
            lecture_num=body.lecture_num,
            title=clean_title or f"المحاضرة {body.lecture_num}",
            doctor=clean_doctor,
            status="queued",
            stage_info="تم الرفع بنجاح، محرك المعالجة المنزلي هيلتقطها خلال ثوانٍ 🚀",
            source_pdf_url=primary_url,
        )
        db.add(lecture)
        db.flush()

    # Register each uploaded PDF file as an original_pdf asset
    files_to_register = body.files if body.files else [{"url": primary_url, "title": f"المحاضرة {body.lecture_num}.pdf", "size": None}]
    for f in files_to_register:
        f_url = f.get("url")
        if not f_url:
            continue
        f_title = f.get("title") or "ملف أصلي"
        f_size = f.get("size")
        db.add(MediaAsset(
            lecture_id=lecture.id,
            asset_type="original_pdf",
            title=f_title,
            local_file_path=f_url,
            telegram_file_id="supabase_storage",
            file_size_bytes=f_size,
        ))

    db.commit()
    db.refresh(lecture)
    return {"ok": True, "id": lecture.id, "lecture_num": lecture.lecture_num,
            "title": lecture.title, "status": lecture.status, "files_count": len(files_to_register)}


@router.get("/lectures/{lecture_id}")
def get_lecture_bundle(lecture_id: int, db: Session = Depends(get_db)):
    """Returns full lecture details and its media assets for student view."""
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    assets = []
    for a in lecture.assets:
        has_tg = bool(a.telegram_file_id or a.telegram_message_id)
        has_local = False
        if a.local_file_path:
            try:
                p = Path(a.local_file_path)
                has_local = p.exists() and is_safe_path(p)
            except Exception:
                has_local = False

        is_available = has_tg or has_local

        assets.append({
            "id": a.id,
            "asset_type": a.asset_type,
            "title": a.title,
            "file_size_bytes": a.file_size_bytes,
            "has_telegram": has_tg,
            "is_available": is_available,
            "content_text": a.content_text,
            "stream_url": f"/api/stream/{a.id}"
        })

    return {
        "id": lecture.id,
        "subject_id": lecture.subject_id,
        "subject_name": lecture.subject.name,
        "lecture_num": lecture.lecture_num,
        "title": lecture.title,
        "doctor": lecture.doctor,
        "status": lecture.status,
        "stage_info": lecture.stage_info,
        "error_message": lecture.error_message,
        "assets": assets,
        "created_at": lecture.created_at
    }


@router.post("/lectures/{lecture_id}/sync-media")
async def sync_lecture_media_endpoint(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    On-demand fetch: Checks NotebookLM cloud if audio/video finished,
    attaches them to the lecture, and returns the updated lecture bundle.
    Requires authenticated admin session.
    """
    from app.services.notebooklm_service import NotebookLMPipeline
    await NotebookLMPipeline.sync_lecture_media(lecture_id, db)
    return get_lecture_bundle(lecture_id, db)

