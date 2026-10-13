from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
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
    """Returns all 11 subjects registered in the system with their doctor tracks."""
    subjects = db.query(Subject).all()
    res = []
    for s in subjects:
        res.append({
            "id": s.id,
            "name": s.name,
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

@router.get("/lectures/{lecture_id}")
def get_lecture_bundle(lecture_id: int, db: Session = Depends(get_db)):
    """Returns full lecture details and its media assets for student view."""
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    assets = []
    for a in lecture.assets:
        assets.append({
            "id": a.id,
            "asset_type": a.asset_type,
            "title": a.title,
            "file_size_bytes": a.file_size_bytes,
            "has_telegram": bool(a.telegram_file_id),
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

