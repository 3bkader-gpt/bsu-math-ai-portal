import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.database import engine, Base, SessionLocal
from app.services.prompt_service import sync_subjects_from_filesystem
from app.services.auth_service import init_admin_user
from app.routes import lectures, upload, stream, auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

# Initialize DB tables
Base.metadata.create_all(bind=engine)

# Auto-sync subjects from filesystem & seed admin user
with SessionLocal() as db:
    synced = sync_subjects_from_filesystem(db)
    init_admin_user(db)
    logger.info(f"Initialized {len(synced)} academic subjects from {settings.COLLEGE_DIR}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Automated Academic Content Pipeline & Media Delivery Server"
)

# CORS Configuration: restrict to authorized client origins
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://bsu-math-ai-portal.pages.dev",
]
custom_origins = getattr(settings, "ALLOWED_ORIGINS", "") or ""
if custom_origins:
    allowed_origins.extend([o.strip() for o in custom_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.pages\.dev",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(lectures.router)
app.include_router(upload.router)
app.include_router(stream.router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "telegram_configured": settings.TELEGRAM_BOT_TOKEN != "",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
