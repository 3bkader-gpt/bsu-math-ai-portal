import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db

logger = logging.getLogger("stats")
router = APIRouter(prefix="/api/stats", tags=["cohort-stats"])

@router.get("/traps")
def get_lecture_traps(
    lecture_id: int = Query(..., description="ID of the lecture to fetch question difficulty traps for"),
    db: Session = Depends(get_db)
):
    """
    Returns question difficulty stats and trap badges for a given lecture.
    Passive cohort intelligence calculated automatically from activity_events.
    """
    try:
        sql = text("""
            SELECT question_hash, total_attempts, incorrect_attempts, failure_rate_pct
            FROM public.v_question_cohort_stats
            WHERE lecture_id = :lecture_id;
        """)
        rows = db.execute(sql, {"lecture_id": lecture_id}).fetchall()
        
        traps = {}
        for r in rows:
            q_hash = r[0]
            total = int(r[1] or 0)
            wrong = int(r[2] or 0)
            rate = float(r[3] or 0.0)
            # Question is flagged as an Exam Trap if at least 1 wrong attempt exists and failure rate is high
            is_trap = (wrong >= 1 and rate >= 50.0) or (total >= 5 and rate >= 40.0)
            traps[q_hash] = {
                "question_hash": q_hash,
                "total_attempts": total,
                "incorrect_attempts": wrong,
                "failure_rate_pct": rate,
                "is_trap": is_trap
            }
        return {"lecture_id": lecture_id, "traps": traps}
    except Exception as exc:
        logger.warning(f"Failed fetching traps for lecture {lecture_id}: {exc}")
        return {"lecture_id": lecture_id, "traps": {}}

@router.get("/cohort-hurdles")
def get_cohort_hurdles(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Returns the top most difficult questions (highest failure rate) across the whole cohort.
    Powers the 'معركة أصعب فخاخ الدفعة' modal.
    """
    try:
        sql = text("""
            SELECT 
                s.question_hash, 
                s.lecture_id, 
                s.question_text, 
                s.explanation, 
                s.correct_answer,
                s.total_attempts, 
                s.incorrect_attempts, 
                s.failure_rate_pct,
                sub.name as subject_name, 
                l.title as lecture_title, 
                l.lecture_num
            FROM public.v_question_cohort_stats s
            JOIN public.lectures l ON s.lecture_id = l.id
            JOIN public.subjects sub ON l.subject_id = sub.id
            WHERE s.incorrect_attempts > 0
            ORDER BY s.failure_rate_pct DESC, s.total_attempts DESC
            LIMIT :limit;
        """)
        rows = db.execute(sql, {"limit": limit}).fetchall()
        
        hurdles = []
        for r in rows:
            hurdles.append({
                "question_hash": r[0],
                "lecture_id": r[1],
                "question_text": r[2],
                "explanation": r[3],
                "correct_answer": r[4],
                "total_attempts": int(r[5] or 0),
                "incorrect_attempts": int(r[6] or 0),
                "failure_rate_pct": float(r[7] or 0.0),
                "subject_name": r[8],
                "lecture_title": r[9],
                "lecture_num": r[10]
            })
        return hurdles
    except Exception as exc:
        logger.warning(f"Failed fetching cohort hurdles: {exc}")
        return []

@router.get("/momentum")
def get_cohort_momentum(db: Session = Depends(get_db)):
    """
    Returns 7-day rolling activity momentum per lecture.
    Powers passive badges on lecture cards (e.g. '🔥 اتفرمت 75 مرة هذا الأسبوع').
    """
    try:
        sql = text("""
            SELECT lecture_id, weekly_activity_count, today_activity_count
            FROM public.v_lecture_cohort_momentum
            WHERE weekly_activity_count > 0;
        """)
        rows = db.execute(sql).fetchall()
        
        momentum = {}
        for r in rows:
            lid = str(r[0])
            weekly = int(r[1] or 0)
            today = int(r[2] or 0)
            
            badge_text = None
            if today >= 5:
                badge_text = "⚡ الأكثر نشاطاً اليوم بين زملائك"
            elif weekly >= 5:
                badge_text = f"🔥 اتفرمت {weekly} مرة هذا الأسبوع"
            elif weekly >= 1:
                badge_text = f"✨ اتذاكرت {weekly} مرات مؤخراً"
                
            momentum[lid] = {
                "weekly_activity_count": weekly,
                "today_activity_count": today,
                "badge": badge_text,
                "badge_text": badge_text
            }
        return {
            "momentum": momentum
        }
    except Exception as exc:
        logger.warning(f"Failed fetching cohort momentum: {exc}")
        return {"momentum": {}}
