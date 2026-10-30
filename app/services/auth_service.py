import os
import hashlib
import hmac
import secrets as _secrets
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.db.database import get_db
from app.db.models import User

# Secret key & token expiration
# Fail-closed: never fall back to a public constant. If SECRET_KEY is missing,
# an ephemeral random key is generated so forged tokens remain impossible;
# all sessions are invalidated on restart until the env var is configured.
SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("TELEGRAM_API_HASH") or _secrets.token_urlsafe(48)
if not os.getenv("SECRET_KEY") and not os.getenv("TELEGRAM_API_HASH"):
    print("⚠️ SECURITY: SECRET_KEY env var is not set — using an ephemeral JWT secret. "
          "All sessions invalidate on restart. Set SECRET_KEY in the deployment environment.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Securely hashes password using PBKDF2-HMAC-SHA256."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return salt.hex() + ":" + key.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salt:key hash."""
    try:
        salt_hex, key_hex = hashed_password.split(":")
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    """Generates a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None

def init_admin_user(db: Session):
    """Ensures default admin user exists from environment configuration."""
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD")
    if not admin_pass:
        # Fail-closed: a random unguessable password instead of a public constant.
        admin_pass = _secrets.token_urlsafe(18)
        print("⚠️ SECURITY: ADMIN_PASSWORD env var is not set — an ephemeral random admin "
              "password was generated (login via the known default is impossible). "
              "Set ADMIN_PASSWORD in the deployment environment.")

    user = db.query(User).filter(User.username == admin_user).first()
    if not user:
        user = User(
            username=admin_user,
            password_hash=hash_password(admin_pass),
            role="admin"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI Dependency for protecting endpoints with Bearer Token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="يرجى تسجيل الدخول أولاً",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="جلسة غير صالحة أو منتهية الصلاحية",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = payload["sub"]
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير موجود")
    return user
