"""Dynamic Notification Engine for BSU Math AI Portal.

Generates charming, context-aware student notifications tailored to each
subject, doctor, and lecture, and broadcasts them via Web Push (PWA/Browser)
and In-App Notification Center.
"""

import asyncio
import json
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from zoneinfo import ZoneInfo
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import settings
from app.db.database import SessionLocal
from app.db.models import Lecture, Notification, PushSubscription

logger = logging.getLogger("notification_service")

# Subject-specific metadata and visual charms
SUBJECT_THEMES = {
    "هندسة تفاضلية": {
        "icon": "📐",
        "charm": "روقان المنحنيات وإطار فرينيه",
        "vibe": "المنحنيات والسطوح مشروحة بروقان وخطوات الحل خطوة بخطوة 🌸",
    },
    "فلسفة وتاريخ الرياضيات": {
        "icon": "🏛️",
        "charm": "أسرار الرياضيات والحضارة الإسلامية",
        "vibe": "جرعة تاريخ ممتعة ورموز الجبر وأسرار العلماء الأولين ☕",
    },
    "فلسفه وتاريخ رياضيات": {
        "icon": "🏛️",
        "charm": "أسرار الرياضيات والحضارة الإسلامية",
        "vibe": "جرعة تاريخ ممتعة ورموز الجبر وأسرار العلماء الأولين ☕",
    },
    "ديناميكا (٢)": {
        "icon": "🚀",
        "charm": "حركة الجسيمات وقوانين نيوتن",
        "vibe": "السرعات والعجلات والمسائل الثقيلة متبسطة بأسهل أسلوب 🎯",
    },
    "ديناميكا 2": {
        "icon": "🚀",
        "charm": "حركة الجسيمات وقوانين نيوتن",
        "vibe": "السرعات والعجلات والمسائل الثقيلة متبسطة بأسهل أسلوب 🎯",
    },
    "معادلات تفاضلية": {
        "icon": "∫",
        "charm": "فنون التكامل وطرق الحل النموذجية",
        "vibe": "المعادلات وطرق الحل النموذجية محلولة بالتفصيل الكامل 💡",
    },
    "استاتيكا (٢)": {
        "icon": "⚖️",
        "charm": "قوى الاتزان والعزوم",
        "vibe": "اتزان وروقان ومسائل الاحتكاك مفسرة بدقة عالية 🧠",
    },
    "استاتيكا2": {
        "icon": "⚖️",
        "charm": "قوى الاتزان والعزوم",
        "vibe": "اتزان وروقان ومسائل الاحتكاك مفسرة بدقة عالية 🧠",
    },
    "مقدمة في نظرية العدد والمنطق": {
        "icon": "🔢",
        "charm": "البراهين والأعداد الأولية",
        "vibe": "البراهين الرياضية والأعداد الأولية مشروحة بسلاسة وفهم عميق 🌟",
    },
    "نظريه عدد ومنطق": {
        "icon": "🔢",
        "charm": "البراهين والأعداد الأولية",
        "vibe": "البراهين الرياضية والأعداد الأولية مشروحة بسلاسة وفهم عميق 🌟",
    },
    "كهربية ومغناطيسية وتيار متردد": {
        "icon": "🧲",
        "charm": "المجالات والدوائر الكهربية",
        "vibe": "قوانين كيرشوف والمجالات الكهربية بتجارب وتوضيحات شاملة ⚡",
    },
    "كهربيه مغناطيسية وتيار متردد": {
        "icon": "🧲",
        "charm": "المجالات والدوائر الكهربية",
        "vibe": "قوانين كيرشوف والمجالات الكهربية بتجارب وتوضيحات شاملة ⚡",
    },
    "التعليم وريادة الأعمال": {
        "icon": "💼",
        "charm": "بناء المشاريع والابتكار",
        "vibe": "أفكار المشاريع والريادة وطرق التميز العملي 🚀",
    },
    "تعليم ورياده اعمال": {
        "icon": "💼",
        "charm": "بناء المشاريع والابتكار",
        "vibe": "أفكار المشاريع والريادة وطرق التميز العملي 🚀",
    },
    "تدريس مصغر": {
        "icon": "🎓",
        "charm": "فنون التدريس وإدارة الصف",
        "vibe": "مهارات العرض والشرح والتهيئة الحافزة لمعلم المستقبل 👨‍🏫",
    },
    "تكنولوجيا التعليم": {
        "icon": "💻",
        "charm": "التحول الرقمي والذكاء الاصطناعي",
        "vibe": "أحدث الأدوات الرقمية والوسائط التفاعلية في التعليم 📱",
    },
    "تكنولوجيا والتحول الرقمي": {
        "icon": "💻",
        "charm": "التحول الرقمي والذكاء الاصطناعي",
        "vibe": "أحدث الأدوات الرقمية والوسائط التفاعلية في التعليم 📱",
    },
    "إدارة المعرفة": {
        "icon": "📚",
        "charm": "استراتيجيات ونظم المعرفة",
        "vibe": "تنظيم وتوثيق المعارف ومفاهيم الإدارة الحديثة 📑",
    },
    "اداره معرفه": {
        "icon": "📚",
        "charm": "استراتيجيات ونظم المعرفة",
        "vibe": "تنظيم وتوثيق المعارف ومفاهيم الإدارة الحديثة 📑",
    },
}

DEFAULT_THEME = {
    "icon": "🌸",
    "charm": "شرح أكاديمي متميز ومبسّط",
    "vibe": "شرح رايق وبودكاست وفيديو وكويز جاهزين لمساعدتك 💖",
}


def get_subject_theme(subject_name: str, subject_obj: Optional[ Any ] = None) -> Dict[str, str]:
    norm = subject_name.strip()
    base = dict(DEFAULT_THEME)
    if norm in SUBJECT_THEMES:
        base.update(SUBJECT_THEMES[norm])
    else:
        for key, val in SUBJECT_THEMES.items():
            if key in norm or norm in key:
                base.update(val)
                break

    if subject_obj is not None:
        db_icon = getattr(subject_obj, "icon", None)
        if isinstance(db_icon, str) and db_icon.strip():
            base["icon"] = db_icon.strip()

        raw_cfg = getattr(subject_obj, "theme_config_json", None)
        if raw_cfg:
            try:
                cfg = json.loads(raw_cfg) if isinstance(raw_cfg, str) else raw_cfg
                if isinstance(cfg, dict):
                    if cfg.get("charm"):
                        base["charm"] = str(cfg["charm"])
                    if cfg.get("vibe"):
                        base["vibe"] = str(cfg["vibe"])
            except Exception:
                pass

    return base


def compose_lecture_notification(lecture: Lecture) -> Dict[str, Any]:
    """Generates an aesthetic, friendly, motivational notification object."""
    subject_name = lecture.subject.name if lecture.subject else "رياضيات"
    theme = get_subject_theme(subject_name, getattr(lecture, "subject", None))
    icon = theme["icon"]
    doctor_label = f"مع {lecture.doctor}" if lecture.doctor else ""

    title = f"{icon} محاضرة جديدة في {subject_name}!"
    message = (
        f"المحاضرة {lecture.lecture_num}: {lecture.title} {doctor_label} نزلت الآن على المنصة! "
        f"{theme['vibe']} (بودكاست 🎧 + فيديو 🎬 + كويز تفاعلي 📝)"
    )
    url = f"/lecture?id={lecture.id}"

    return {
        "lecture_id": lecture.id,
        "subject_name": subject_name,
        "lecture_num": lecture.lecture_num,
        "doctor": lecture.doctor,
        "title": title,
        "message": message,
        "icon": icon,
        "url": url,
    }


def record_notification(db: Session, lecture: Lecture) -> Optional[Notification]:
    """Persists a notification record in the DB if not already recorded."""
    existing = db.query(Notification).filter(Notification.lecture_id == lecture.id).first()
    if existing:
        return existing

    data = compose_lecture_notification(lecture)
    notif = Notification(
        lecture_id=data["lecture_id"],
        subject_name=data["subject_name"],
        lecture_num=data["lecture_num"],
        doctor=data["doctor"],
        title=data["title"],
        message=data["message"],
        icon=data["icon"],
        url=data["url"],
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    logger.info("Created notification record #%s for lecture %s", notif.id, lecture.id)
    return notif


def dispatch_web_push_payload(sub: PushSubscription, payload: dict) -> bool:
    """Dispatches a single Web Push notification synchronously using pywebpush."""
    try:
        from pywebpush import webpush, WebPushException
        from py_vapid import Vapid

        sub_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }

        vapid_key = (settings.VAPID_PRIVATE_KEY or "").replace("\\n", "\n").strip()
        if not vapid_key:
            logger.warning("VAPID_PRIVATE_KEY is not configured; skipping Web Push delivery.")
            return False
        if vapid_key.startswith("-----BEGIN"):
            vapid_key = Vapid.from_pem(vapid_key.encode("utf-8"))

        res = webpush(
            subscription_info=sub_info,
            data=json.dumps(payload),
            vapid_private_key=vapid_key,
            vapid_claims={"sub": settings.VAPID_CLAIMS_EMAIL},
            timeout=10,
        )
        return res.status_code in (200, 201)
    except Exception as exc:
        msg = str(exc).lower()
        logger.warning("Web Push delivery failed to %s: %s", sub.endpoint[:40], exc)
        # If subscription expired/unregistered (410 Gone or 404), signal for deletion
        if "410" in msg or "404" in msg or "unregistered" in msg or "expired" in msg:
            with SessionLocal() as db:
                db.query(PushSubscription).filter(PushSubscription.id == sub.id).delete()
                db.commit()
                logger.info("Pruned expired push subscription #%s", sub.id)
        return False


async def broadcast_new_lecture(lecture_id: int):
    """Entry point called when a lecture is marked completed.
    
    1. Persists the In-App notification record in Postgres.
    2. Broadcasts Web Push to all registered student browser/PWA subscriptions.
    """
    logger.info("Broadcasting notification for completed lecture #%s...", lecture_id)
    with SessionLocal() as db:
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if not lecture:
            logger.warning("Cannot notify for lecture %s: not found", lecture_id)
            return

        notif = record_notification(db, lecture)
        subscriptions = db.query(PushSubscription).all()

    if not subscriptions:
        logger.info("No push subscriptions registered yet. In-App notification ready.")
        return

    push_payload = {
        "title": notif.title,
        "body": notif.message,
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "data": {
            "url": notif.url,
            "lecture_id": lecture_id,
            "notification_id": notif.id,
        },
    }

    loop = asyncio.get_event_loop()
    sem = asyncio.Semaphore(20)

    async def _bounded_push(sub):
        async with sem:
            return await loop.run_in_executor(None, dispatch_web_push_payload, sub, push_payload)

    tasks = [_bounded_push(sub) for sub in subscriptions]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    delivered = sum(1 for r in results if r is True)
    logger.info("Web Push broadcast for lecture %s completed: %d/%d delivered",
                lecture_id, delivered, len(subscriptions))


def get_cairo_today(now_utc: Optional[datetime] = None) -> date:
    """Returns today's calendar date in Africa/Cairo timezone."""
    dt = now_utc or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    try:
        return dt.astimezone(ZoneInfo("Africa/Cairo")).date()
    except Exception:
        return (dt + timedelta(hours=2)).date()


def compose_study_reminder_payload(
    student_name: Optional[str],
    persona: Optional[str],
    current_streak: int,
    due_mistakes_count: int,
    cairo_today: date,
    studied_today: bool,
) -> Optional[dict]:
    """Builds a personalized daily study reminder push payload, or None to skip spam."""
    if studied_today and due_mistakes_count <= 0:
        return None

    is_girl = (persona or "").strip().lower() == "girls"
    default_call = "يا دكتورة" if is_girl else "يا بطل"
    greeting = student_name.strip() if student_name and student_name.strip() else default_call

    if due_mistakes_count > 0:
        title = f"🎯 عندك {due_mistakes_count} سؤال جاهز للمراجعة"
        body = (
            f"أهلاً {greeting}! فيه {due_mistakes_count} نقطة في كشكول أخطائك "
            f"مستنية مراجعة سريعة النهارده عشان تثبت قبل الامتحان."
        )
        reason = "due_mistakes"
    elif current_streak >= 2:
        title = f"🔥 حافظ على سلسلة {current_streak} أيام، {greeting}!"
        body = (
            "5 دقايق مذاكرة أو حل كويز واحد دلوقتي هتحافظ على سلسلتك وتزود نقاطك."
        )
        reason = "streak_guard"
    else:
        title = f"☕ 5 دقايق روقان تفرق، {greeting}!"
        body = (
            "ادخل كمل محاضرة النهارده أو اسمع ملخص الزتونة الصوتية على البوابة."
        )
        reason = "daily_nudge"

    return {
        "title": title,
        "body": body,
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "data": {
            "url": "/",
            "type": "study_reminder",
            "reason": reason,
            "tag": f"study-reminder-{cairo_today.isoformat()}",
            "actionTitle": "ابدأ المذاكرة 🚀",
        },
    }


def _load_profile_and_due_maps(
    db: Session,
    user_ids: List[str],
    cairo_today: date,
) -> tuple[Dict[str, dict], Dict[str, int]]:
    """Fetches profile streak info and due Leitner review counts safely."""
    profile_map: Dict[str, dict] = {}
    due_map: Dict[str, int] = {}
    if not user_ids:
        return profile_map, due_map

    try:
        with db.begin_nested():
            rows = db.execute(
                text(
                    "SELECT id::text AS uid, nickname, persona, current_streak, last_active_date "
                    "FROM public.profiles WHERE id::text = ANY(:uids)"
                ),
                {"uids": user_ids},
            ).fetchall()
            for r in rows:
                profile_map[str(r[0])] = {
                    "nickname": r[1],
                    "persona": r[2],
                    "current_streak": int(r[3] or 0),
                    "last_active_date": r[4],
                }
    except Exception as exc:
        logger.debug("Profile lookup skipped for study reminders: %s", exc)

    try:
        with db.begin_nested():
            rows = db.execute(
                text(
                    "SELECT user_id::text AS uid, COUNT(*) AS due_cnt "
                    "FROM public.mistake_notebook "
                    "WHERE user_id::text = ANY(:uids) "
                    "  AND is_mastered = false "
                    "  AND next_review_date <= :today "
                    "GROUP BY user_id"
                ),
                {"uids": user_ids, "today": cairo_today},
            ).fetchall()
            for r in rows:
                due_map[str(r[0])] = int(r[1] or 0)
    except Exception as exc:
        logger.debug("Mistake notebook due-count skipped for study reminders: %s", exc)

    return profile_map, due_map


def send_scheduled_study_reminders(
    db: Session,
    dry_run: bool = False,
    now_utc: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Dispatches daily scheduled study reminders to active PWA/Web Push subscribers."""
    cairo_today = get_cairo_today(now_utc)
    subscriptions = (
        db.query(PushSubscription)
        .order_by(PushSubscription.id.desc())
        .all()
    )

    user_ids = sorted({str(s.user_id).strip() for s in subscriptions if s.user_id and str(s.user_id).strip()})
    profile_map, due_map = _load_profile_and_due_maps(db, user_ids, cairo_today)

    seen_endpoints = set()
    eligible = 0
    skipped_already_studied = 0
    delivered = 0
    reasons: Dict[str, int] = {"due_mistakes": 0, "streak_guard": 0, "daily_nudge": 0}

    for sub in subscriptions:
        ep = (sub.endpoint or "").strip()
        if not ep or ep in seen_endpoints:
            continue
        seen_endpoints.add(ep)

        uid = str(sub.user_id).strip() if sub.user_id else ""
        prof = profile_map.get(uid, {})
        last_active = prof.get("last_active_date")
        if isinstance(last_active, datetime):
            last_active_date = last_active.date()
        elif isinstance(last_active, str) and last_active:
            try:
                last_active_date = date.fromisoformat(last_active[:10])
            except ValueError:
                last_active_date = None
        else:
            last_active_date = last_active

        studied_today = last_active_date == cairo_today
        due_count = due_map.get(uid, 0)
        streak = int(prof.get("current_streak") or 0)
        display_name = sub.student_name or prof.get("nickname")
        if display_name in ("عاشق الرياضيات", "عاشقة الرياضيات"):
            display_name = None

        payload = compose_study_reminder_payload(
            student_name=display_name,
            persona=prof.get("persona"),
            current_streak=streak,
            due_mistakes_count=due_count,
            cairo_today=cairo_today,
            studied_today=studied_today,
        )
        if payload is None:
            skipped_already_studied += 1
            continue

        eligible += 1
        r_key = payload["data"]["reason"]
        reasons[r_key] = reasons.get(r_key, 0) + 1

        if not dry_run:
            if dispatch_web_push_payload(sub, payload):
                delivered += 1

    return {
        "status": "ok",
        "cairo_date": cairo_today.isoformat(),
        "total_subscriptions": len(seen_endpoints),
        "eligible": eligible,
        "skipped_already_studied": skipped_already_studied,
        "delivered": delivered,
        "dry_run": dry_run,
        "reasons": reasons,
    }
