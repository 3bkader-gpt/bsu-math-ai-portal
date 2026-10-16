from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
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
