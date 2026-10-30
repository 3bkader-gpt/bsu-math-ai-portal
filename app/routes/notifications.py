"""API Routes for In-App & Web Push Notifications."""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.config import settings
from app.db.database import get_db
from app.db.models import Notification, PushSubscription
from app.services.notification_service import dispatch_web_push_payload

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
    userAgent: Optional[str] = None


class UnsubscribeRequest(BaseModel):
    endpoint: str


class NotificationResponse(BaseModel):
    id: int
    lecture_id: Optional[int] = None
    subject_name: str
    lecture_num: int
    doctor: Optional[str] = None
    title: str
    message: str
    icon: str
    url: str
    created_at: datetime


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Returns recent student notifications ordered by creation date descending."""
    notifs = (
        db.query(Notification)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return notifs


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Returns the application server public key needed for browser PushManager subscription."""
    return {"publicKey": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe")
def subscribe_push(req: PushSubscriptionRequest, db: Session = Depends(get_db)):
    """Registers or updates a student browser/mobile Web Push subscription."""
    endpoint = req.endpoint.strip()
    if not endpoint:
        raise HTTPException(status_code=400, detail="Invalid endpoint")

    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
    if existing:
        existing.p256dh = req.keys.p256dh
        existing.auth = req.keys.auth
        existing.user_agent = req.userAgent
        db.commit()
        return {"success": True, "message": "تم تحديث اشتراك الإشعارات"}

    new_sub = PushSubscription(
        endpoint=endpoint,
        p256dh=req.keys.p256dh,
        auth=req.keys.auth,
        user_agent=req.userAgent,
    )
    db.add(new_sub)
    db.commit()
    return {"success": True, "message": "تم تفعيل الإشعارات بنجاح"}


@router.post("/unsubscribe")
def unsubscribe_push(req: UnsubscribeRequest, db: Session = Depends(get_db)):
    """Removes a push subscription."""
    db.query(PushSubscription).filter(PushSubscription.endpoint == req.endpoint.strip()).delete()
    db.commit()
    return {"success": True, "message": "تم إلغاء الاشتراك"}


@router.post("/test-push")
def test_push_notification(endpoint: Optional[str] = None, db: Session = Depends(get_db)):
    """Sends a friendly test push notification to verify connectivity."""
    query = db.query(PushSubscription)
    if endpoint:
        query = query.filter(PushSubscription.endpoint == endpoint.strip())
    subs = query.all()

    if not subs:
        raise HTTPException(status_code=404, detail="No active push subscriptions found to test")

    test_payload = {
        "title": "🌸 تجربة إشعارات المنصة!",
        "body": "الإشعارات شغالة ومية مية على جهازك! أول ما تنزل أي محاضرة جديدة هتوصلك فوراً ☕✨",
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "data": {
            "url": "/",
            "test": True
        }
    }

    delivered = 0
    for s in subs:
        if dispatch_web_push_payload(s, test_payload):
            delivered += 1

    return {"success": True, "delivered": delivered, "total": len(subs)}
