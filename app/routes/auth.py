import hashlib
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.config import settings
from app.db.database import get_db
from app.db.models import User
from app.services.auth_service import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    ok: bool
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str

class AnonymousSessionRequest(BaseModel):
    deviceId: str | None = None
    nickname: str | None = "عاشق الرياضيات"
    persona: str | None = "boys"

class AnonymousSessionResponse(BaseModel):
    ok: bool
    email: str
    password: str
    user_id: str

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Logs in admin/uploader and issues a JWT Bearer Token."""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة"
        )

    token = create_access_token({"sub": user.username, "role": user.role})
    return LoginResponse(
        ok=True,
        access_token=token,
        username=user.username,
        role=user.role
    )

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Validates the current session token."""
    return {
        "ok": True,
        "username": current_user.username,
        "role": current_user.role,
        "created_at": current_user.created_at
    }

@router.post("/anonymous-session", response_model=AnonymousSessionResponse)
def get_or_create_anonymous_session(req: AnonymousSessionRequest):
    """
    Provisions a confirmed student guest account in Supabase without sending emails,
    granting an immediate, authenticated session with strict RLS tenant isolation.
    """
    raw_id = (req.deviceId or "default-device").strip()
    id_hash = hashlib.sha256(raw_id.encode("utf-8")).hexdigest()[:12]
    
    email = f"guest.{id_hash}@bsu-math.internal"
    password = f"GuestPass_{id_hash}"

    # Check if Supabase Admin credentials are available
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase credentials not configured on backend."
        )

    admin_headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    try:
        with httpx.Client(timeout=10) as client:
            # 1. Try to create the user directly via Admin API
            r = client.post(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users",
                headers=admin_headers,
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {
                        "nickname": req.nickname or "عاشق الرياضيات",
                        "persona": req.persona or "boys",
                        "is_guest": True
                    }
                }
            )

            if r.status_code in (200, 201):
                user_id = r.json().get("id")
                return AnonymousSessionResponse(
                    ok=True,
                    email=email,
                    password=password,
                    user_id=user_id
                )
            elif r.status_code == 422:
                # User might already exist, verify by checking admin get or signing in
                r_login = client.post(
                    f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                    headers={"apikey": settings.SUPABASE_ANON_KEY, "Content-Type": "application/json"},
                    json={"email": email, "password": password}
                )
                if r_login.status_code == 200:
                    data = r_login.json()
                    user_id = data.get("user", {}).get("id", "")
                    return AnonymousSessionResponse(
                        ok=True,
                        email=email,
                        password=password,
                        user_id=user_id
                    )

            # If other error
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to provision anonymous account: {r.text}"
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error connecting to Supabase: {str(e)}"
        )
