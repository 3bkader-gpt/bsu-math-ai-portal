import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

import httpx
from app.config import settings

API_TOKEN = "rnd_mNIZQDcLvNEbwc6XjdrmUdm3e6Nd"
SERVICE_ID = "srv-db8e6geq1p3s73ah7kh0"

env_vars = [
    {"key": "DATABASE_URL", "value": settings.DATABASE_URL},
    {"key": "SUPABASE_URL", "value": settings.SUPABASE_URL},
    {"key": "SUPABASE_ANON_KEY", "value": settings.SUPABASE_ANON_KEY},
    {"key": "SUPABASE_SERVICE_ROLE_KEY", "value": settings.SUPABASE_SERVICE_ROLE_KEY},
    {"key": "TELEGRAM_BOT_TOKEN", "value": settings.TELEGRAM_BOT_TOKEN},
    {"key": "TELEGRAM_CHANNEL_ID", "value": str(settings.TELEGRAM_CHANNEL_ID)},
    {"key": "TELEGRAM_API_ID", "value": str(settings.TELEGRAM_API_ID)},
    {"key": "TELEGRAM_API_HASH", "value": settings.TELEGRAM_API_HASH},
    {"key": "TELETHON_SESSION_STRING", "value": settings.TELETHON_SESSION_STRING},
    {"key": "ALLOWED_ORIGINS", "value": "*"},
]

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

url = f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars"
resp = httpx.put(url, headers=headers, json=env_vars)
print("PUT Status:", resp.status_code)
if resp.status_code in (200, 201):
    print("Successfully set all environment variables on Render!")
    for item in resp.json():
        print(" -", item.get("envVar", {}).get("key"))
else:
    print("Error:", resp.text)
