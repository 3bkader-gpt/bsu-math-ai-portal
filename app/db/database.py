from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# Connection args & pool recycling (essential for Cloud PostgreSQL / Supabase)
engine_kwargs = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300
    connect_args = {}
    if "aws-1-eu-central-1.pooler.supabase.com" in settings.DATABASE_URL:
        # Bypasses local router/ISP DNS timeouts by supplying direct pooler IP
        connect_args["hostaddr"] = "3.65.151.229"
    engine_kwargs["connect_args"] = connect_args

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
