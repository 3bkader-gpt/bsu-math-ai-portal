import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Academic Content Pipeline Engine"
    VERSION: str = "1.0.0"
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    COLLEGE_DIR: Path = Path(r"D:\الكليه")
    MEDIA_DIR: Path = Path(__file__).resolve().parent.parent / "media_storage"
    
    # Database (SQLite by default, or Supabase PostgreSQL)
    DATABASE_URL: str = "sqlite:///./bot_database.db"
    
    # Telegram Storage Backend
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHANNEL_ID: str = os.getenv("TELEGRAM_CHANNEL_ID", "")  # e.g., "-1001234567890" or "@my_storage_channel"
    TELEGRAM_API_ID: int = int(os.getenv("TELEGRAM_API_ID", "0"))
    TELEGRAM_API_HASH: str = os.getenv("TELEGRAM_API_HASH", "")
    
    # Supabase Settings
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # NotebookLM Settings
    NOTEBOOKLM_DEFAULT_LANG: str = "ar_eg"
    NOTEBOOKLM_PROFILE: str = "default"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
settings.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
