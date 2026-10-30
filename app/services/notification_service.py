"""Dynamic Notification Engine for BSU Math AI Portal.

Generates charming, context-aware student notifications tailored to each
subject, doctor, and lecture, and broadcasts them via Web Push (PWA/Browser)
and In-App Notification Center.
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, List
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


def get_subject_theme(subject_name: str) -> Dict[str, str]:
    norm = subject_name.strip()
    if norm in SUBJECT_THEMES:
        return SUBJECT_THEMES[norm]
    for key, val in SUBJECT_THEMES.items():
        if key in norm or norm in key:
            return val
    return DEFAULT_THEME


def compose_lecture_notification(lecture: Lecture) -> Dict[str, Any]:
    """Generates an aesthetic, friendly, motivational notification object."""
    subject_name = lecture.subject.name if lecture.subject else "رياضيات"
    theme = get_subject_theme(subject_name)
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

        sub_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        res = webpush(
            subscription_info=sub_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
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
    tasks = [
        loop.run_in_executor(None, dispatch_web_push_payload, sub, push_payload)
        for sub in subscriptions
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    delivered = sum(1 for r in results if r is True)
    logger.info("Web Push broadcast for lecture %s completed: %d/%d delivered",
                lecture_id, delivered, len(subscriptions))
