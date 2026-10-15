import time
import logging
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Subject, Lecture, MediaAsset
from app.services.telethon_service import telethon_streamer
from app.services.logger_service import log_handler
from app.config import settings

logger = logging.getLogger("DiagnosticsRouter")

router = APIRouter(prefix="/api/diagnostics", tags=["System Diagnostics & Logs"])

class ClientLogPayload(BaseModel):
    level: str = "ERROR"
    message: str
    context: Optional[dict] = None


@router.get("")
async def get_system_diagnostics(db: Session = Depends(get_db)):
    """
    Returns comprehensive real-time diagnostics of all 21 lectures,
    database health, Telegram MTProto storage, and modality coverage.
    """
    t0 = time.time()
    
    # 1. Database Check
    db_status = "healthy"
    try:
        lectures = db.query(Lecture).join(Subject).order_by(Subject.name, Lecture.lecture_num).all()
        db_latency_ms = round((time.time() - t0) * 1000, 2)
    except Exception as e:
        db_status = f"unhealthy: {e}"
        db_latency_ms = -1
        lectures = []

    # 2. Telegram Client Status
    tg_status = "connected" if (telethon_streamer.client and telethon_streamer.client.is_connected()) else "ready_on_demand"

    # 3. Audit all lectures
    lecture_audits = []
    summary = {
        "total_lectures": len(lectures),
        "complete_5_of_5": 0,
        "partial_modality": 0,
        "missing_assets_count": 0,
        "total_audios": 0,
        "total_videos": 0,
        "total_quizzes_ready": 0,
        "total_guides_ready": 0,
        "total_flashcards_ready": 0,
    }

    for lec in lectures:
        assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == lec.id).all()
        
        quiz = next((a for a in assets if a.asset_type == 'quiz_md'), None)
        guide = next((a for a in assets if a.asset_type == 'study_guide_md'), None)
        cards = next((a for a in assets if a.asset_type in ('flashcards_md', 'flashcards_json')), None)
        audio = next((a for a in assets if a.asset_type == 'audio'), None)
        video = next((a for a in assets if a.asset_type == 'video'), None)

        has_quiz = bool(quiz and (quiz.content_text or quiz.telegram_message_id))
        has_guide = bool(guide and (guide.content_text or guide.telegram_message_id))
        has_cards = bool(cards and (cards.content_text or cards.telegram_message_id))
        has_audio = bool(audio and audio.telegram_message_id)
        has_video = bool(video and video.telegram_message_id)

        if has_quiz: summary["total_quizzes_ready"] += 1
        if has_guide: summary["total_guides_ready"] += 1
        if has_cards: summary["total_flashcards_ready"] += 1
        if has_audio: summary["total_audios"] += 1
        if has_video: summary["total_videos"] += 1

        modality_score = sum([has_quiz, has_guide, has_cards, has_audio, has_video])
        if modality_score == 5:
            summary["complete_5_of_5"] += 1
        else:
            summary["partial_modality"] += 1

        lecture_audits.append({
            "lecture_id": lec.id,
            "subject": lec.subject.name if lec.subject else "غير محدد",
            "lecture_num": lec.lecture_num,
            "title": lec.title,
            "doctor": lec.doctor,
            "score": f"{modality_score}/5",
            "modalities": {
                "quiz": {"ready": has_quiz, "chars": len(quiz.content_text or "") if quiz else 0},
                "guide": {"ready": has_guide, "chars": len(guide.content_text or "") if guide else 0},
                "flashcards": {"ready": has_cards, "chars": len(cards.content_text or "") if cards else 0},
                "audio": {"ready": has_audio, "tg_msg": audio.telegram_message_id if audio else None},
                "video": {"ready": has_video, "tg_msg": video.telegram_message_id if video else None},
            }
        })

    return {
        "status": "online",
        "service": "bsu-math-api",
        "timestamp": time.time(),
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms
        },
        "telegram_mtproto": {
            "status": tg_status,
            "channel_id": settings.TELEGRAM_CHANNEL_ID
        },
        "summary": summary,
        "lectures": lecture_audits
    }

@router.get("/logs")
async def get_system_logs(
    limit: int = Query(default=100, ge=1, le=300),
    level: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None)
):
    """
    Returns live in-memory logs filtered by level or search keyword,
    along with aggregate log statistics.
    """
    logs = log_handler.get_logs(limit=limit, level=level, search=search)
    stats = log_handler.get_stats()
    return {
        "status": "success",
        "stats": stats,
        "count": len(logs),
        "logs": logs
    }

@router.post("/client-log")
async def record_client_error(payload: ClientLogPayload):
    """
    Allows frontend clients to report errors (audio load failures, network drops, etc.)
    into the server diagnostics stream.
    """
    msg = f"[CLIENT_{payload.level.upper()}] {payload.message}"
    if payload.context:
        msg += f" | context: {payload.context}"
    
    if payload.level.upper() == "ERROR":
        logger.error(msg)
    elif payload.level.upper() == "WARNING":
        logger.warning(msg)
    else:
        logger.info(msg)
        
    return {"status": "recorded"}

@router.post("/clear-logs")
async def clear_system_logs():
    """
    Clears the in-memory log buffer.
    """
    log_handler.clear()
    logger.info("System logs buffer was cleared by admin.")
    return {"status": "cleared"}

