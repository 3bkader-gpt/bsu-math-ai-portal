import time
import json
import logging
import threading
from collections import defaultdict
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload, selectinload
from app.db.database import get_db
from app.db.models import Subject, Lecture, MediaAsset, User
from app.services.telethon_service import telethon_streamer
from app.services.logger_service import log_handler
from app.services.auth_service import get_current_user
from app.config import settings

logger = logging.getLogger("DiagnosticsRouter")

router = APIRouter(prefix="/api/diagnostics", tags=["System Diagnostics & Logs"])

# In-memory sliding window rate limiter for client error reporting: max 15 requests per minute per IP
_RATE_LIMIT_MAX_REQUESTS = 15
_RATE_LIMIT_WINDOW_SECONDS = 60.0
_client_log_tracker: dict[str, list[float]] = defaultdict(list)
_rate_limit_lock = threading.Lock()

def check_client_log_rate_limit(client_ip: str) -> bool:
    now = time.time()
    cutoff = now - _RATE_LIMIT_WINDOW_SECONDS
    with _rate_limit_lock:
        timestamps = _client_log_tracker[client_ip]
        valid_timestamps = [t for t in timestamps if t > cutoff]
        if len(valid_timestamps) >= _RATE_LIMIT_MAX_REQUESTS:
            _client_log_tracker[client_ip] = valid_timestamps
            return False
        valid_timestamps.append(now)
        _client_log_tracker[client_ip] = valid_timestamps
        # Periodic cleanup of idle IPs to bound memory usage
        if len(_client_log_tracker) > 1000:
            for ip in list(_client_log_tracker.keys()):
                if not _client_log_tracker[ip] or _client_log_tracker[ip][-1] < cutoff:
                    _client_log_tracker.pop(ip, None)
        return True

class ClientLogPayload(BaseModel):
    level: str = Field(default="ERROR", max_length=10)
    message: str = Field(..., min_length=1, max_length=1000)
    context: Optional[dict] = None

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.strip().upper()
        if upper not in allowed:
            return "ERROR"
        return upper

    @field_validator("context")
    @classmethod
    def validate_context(cls, v: Optional[dict]) -> Optional[dict]:
        if v is not None:
            try:
                s = json.dumps(v)
                if len(s) > 2000:
                    raise ValueError("Context size exceeds maximum permitted limit")
            except (TypeError, OverflowError):
                raise ValueError("Context must be JSON serializable")
        return v


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
        lectures = (
            db.query(Lecture)
            .join(Subject)
            .options(
                joinedload(Lecture.subject),
                selectinload(Lecture.assets)
            )
            .order_by(Subject.name, Lecture.lecture_num)
            .all()
        )
        db_latency_ms = round((time.time() - t0) * 1000, 2)
    except Exception as e:
        logger.error(f"Diagnostics database check failed: {e}", exc_info=True)
        db_status = "unhealthy"
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
        assets = lec.assets
        
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
            "configured": bool(settings.TELEGRAM_CHANNEL_ID)
        },
        "summary": summary,
        "lectures": lecture_audits
    }

@router.get("/logs")
async def get_system_logs(
    limit: int = Query(default=100, ge=1, le=300),
    level: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user)
):
    """
    Returns live in-memory logs filtered by level or search keyword.
    Restricted strictly to authenticated administrative users.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="غير مصرح: الوصول إلى السجلات مقتصر على المشرفين فقط"
        )
    logs = log_handler.get_logs(limit=limit, level=level, search=search)
    stats = log_handler.get_stats()
    return {
        "status": "success",
        "stats": stats,
        "count": len(logs),
        "logs": logs
    }

@router.post("/client-log")
async def record_client_error(payload: ClientLogPayload, request: Request):
    """
    Allows frontend clients to report legitimate browser errors into the diagnostic stream.
    Protected by per-IP sliding window rate limiting and strict payload length validation.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not check_client_log_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تم تجاوز الحد المسموح لإرسال السجلات، يرجى المحاولة لاحقاً"
        )

    clean_msg = payload.message.strip()
    msg = f"[CLIENT_{payload.level.upper()}] {clean_msg}"
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
async def clear_system_logs(current_user: User = Depends(get_current_user)):
    """
    Clears the in-memory log buffer.
    Restricted strictly to authenticated administrative users.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="غير مصرح: مسح السجلات مقتصر على المشرفين فقط"
        )
    log_handler.clear()
    logger.info(f"System logs buffer was cleared by admin user '{current_user.username}'.")
    return {"status": "cleared"}


def _safe_query_dicts(db: Session, sql_str: str, params: Optional[dict] = None) -> list[dict]:
    """
    Executes a read-only SQL query inside a nested transaction (SAVEPOINT) so that
    missing views in lightweight test DBs (e.g. SQLite) do not abort the session.
    """
    try:
        with db.begin_nested():
            result = db.execute(text(sql_str), params or {})
            keys = list(result.keys())
            rows = result.fetchall()
            out = []
            for r in rows:
                row_dict = {}
                for idx, k in enumerate(keys):
                    val = r[idx]
                    if hasattr(val, "isoformat"):
                        val = val.isoformat()
                    elif isinstance(val, (int, float, str, bool)) or val is None:
                        pass
                    else:
                        try:
                            val = float(val)
                        except Exception:
                            val = str(val)
                    row_dict[k] = val
                out.append(row_dict)
            return out
    except Exception as exc:
        logger.debug(f" Analytics query skipped/fallback: {exc}")
        return []


@router.get("/cohort-analytics")
async def get_admin_cohort_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns comprehensive cohort & gamification KPI analytics for the Admin Dashboard.
    Queries locked views (`v_kpi_*`) server-side via postgres/service_role connection
    and enforces strict JWT admin authorization.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="غير مصرح: تحليلات الدفعة مقتصرة على المشرفين فقط",
        )

    dau_list = _safe_query_dicts(
        db,
        """
        SELECT day, active_students_dau, total_xp_distributed, avg_xp_per_student,
               total_learning_items_completed, total_active_minutes
        FROM public.v_kpi_daily_cohort_summary
        ORDER BY day DESC
        LIMIT 14;
        """,
    )

    retention_list = _safe_query_dicts(
        db,
        """
        SELECT signup_day, cohort_size, retained_d1, retained_d3, retained_d7, d1_pct, d7_pct
        FROM public.v_kpi_retention_d7
        ORDER BY signup_day DESC
        LIMIT 10;
        """,
    )

    mistake_review_rows = _safe_query_dicts(
        db,
        """
        SELECT total_mistakes_recorded, mistakes_successfully_reviewed,
               mistakes_fully_mastered, currently_due_count, review_completion_pct
        FROM public.v_kpi_mistake_review_completion
        LIMIT 1;
        """,
    )
    mistake_review_stats = mistake_review_rows[0] if mistake_review_rows else {
        "total_mistakes_recorded": 0,
        "mistakes_successfully_reviewed": 0,
        "mistakes_fully_mastered": 0,
        "currently_due_count": 0,
        "review_completion_pct": 0.0,
    }

    ttfa_list = _safe_query_dicts(
        db,
        """
        SELECT first_action_type, session_count,
               avg_time_to_first_action_sec, median_time_to_first_action_sec
        FROM public.v_kpi_time_to_first_action
        ORDER BY session_count DESC
        LIMIT 10;
        """,
    )

    hardest_questions = _safe_query_dicts(
        db,
        """
        SELECT s.question_hash, s.lecture_id, s.question_text,
               s.total_attempts, s.incorrect_attempts, s.failure_rate_pct,
               sub.name AS subject_name, l.title AS lecture_title, l.lecture_num
        FROM public.v_question_cohort_stats s
        JOIN public.lectures l ON s.lecture_id = l.id
        JOIN public.subjects sub ON l.subject_id = sub.id
        WHERE s.incorrect_attempts > 0
        ORDER BY s.failure_rate_pct DESC, s.total_attempts DESC
        LIMIT 10;
        """,
    )

    profiles_list = _safe_query_dicts(
        db,
        """
        SELECT id, nickname, total_xp, level, current_streak, created_at
        FROM public.profiles
        ORDER BY created_at DESC
        LIMIT 40;
        """,
    )

    profile_counts = _safe_query_dicts(
        db,
        """
        SELECT
            COUNT(*) AS total_profiles,
            COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Africa/Cairo')::date = (now() AT TIME ZONE 'Africa/Cairo')::date) AS today_profiles,
            COUNT(*) FILTER (WHERE total_xp > 0) AS active_xp_students
        FROM public.profiles;
        """,
    )
    counts_obj = profile_counts[0] if profile_counts else {}

    errors_list = _safe_query_dicts(
        db,
        """
        SELECT id, user_id, error_type, error_message, created_at
        FROM public.ingestion_errors
        ORDER BY created_at DESC
        LIMIT 10;
        """,
    )

    challenge_rows = _safe_query_dicts(
        db,
        """
        SELECT id, title, description, target_count, xp_reward, is_active
        FROM public.cohort_challenges
        WHERE is_active = true
        LIMIT 1;
        """,
    )
    active_challenge = challenge_rows[0] if challenge_rows else None

    contrib_rows = _safe_query_dicts(
        db,
        """
        SELECT COUNT(*) AS cnt
        FROM public.cohort_challenge_contributions;
        """,
    )
    total_contribs = int((contrib_rows[0].get("cnt") if contrib_rows else 0) or 0)

    return {
        "status": "success",
        "totalProfilesCount": int(counts_obj.get("total_profiles") or len(profiles_list)),
        "todayProfilesCount": int(counts_obj.get("today_profiles") or 0),
        "activeXpStudentsCount": int(counts_obj.get("active_xp_students") or 0),
        "profilesList": profiles_list,
        "dauList": dau_list,
        "retentionList": retention_list,
        "mistakeReviewStats": mistake_review_stats,
        "timeToFirstActionList": ttfa_list,
        "hardestQuestionsList": hardest_questions,
        "errorsList": errors_list,
        "mistakesCount": int(mistake_review_stats.get("total_mistakes_recorded") or 0),
        "activeChallenge": active_challenge,
        "totalContributions": total_contribs,
    }



