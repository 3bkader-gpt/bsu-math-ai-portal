import subprocess
import json
import time
import os
import sys

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from telethon import TelegramClient
from app.config import settings
from app.db.database import SessionLocal
from app.db.models import MediaAsset

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

LECTURES_WATCH = {
    3: "847bae1d-0271-4715-b8a0-45aa281470ff",
    17: "d8ae29c4-61e0-4c54-aef3-55304308e5cf",
    18: "b7a20b69-43be-43ad-8942-0cae3785fe9d",
    21: "0dc08f05-722e-4e89-8cd3-f04e999e5ac3"
}

TEMP_DIR = r"d:\الكليه\BOT\media_storage\temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def log(msg):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)

async def upload_video(client, lec_id, file_path):
    log(f"Uploading video for Lec #{lec_id} to TG channel: {settings.TELEGRAM_CHANNEL_ID}...")
    size = os.path.getsize(file_path)
    msg = await client.send_file(
        int(settings.TELEGRAM_CHANNEL_ID),
        file_path,
        caption=f"🎬 فيديو الشرح التفاعلي - المحاضرة #{lec_id}",
        supports_streaming=True
    )
    log(f"✅ Uploaded to TG! Msg ID: {msg.id}")
    
    # Update DB
    db = SessionLocal()
    try:
        asset = db.query(MediaAsset).filter(
            MediaAsset.lecture_id == lec_id,
            MediaAsset.asset_type == "video"
        ).first()
        if not asset:
            asset = MediaAsset(
                lecture_id=lec_id,
                asset_type="video",
                title=f"فيديو الشرح التفاعلي - المحاضرة {lec_id}",
                file_size_bytes=size
            )
            db.add(asset)
        asset.telegram_message_id = msg.id
        asset.telegram_file_id = msg.file.id if msg.file else None
        asset.file_size_bytes = size
        db.commit()
        log(f"✅ Supabase updated for Lec #{lec_id} -> TG #{msg.id}")
    finally:
        db.close()

async def main():
    log("🚀 Starting Auto-Upload Watcher for pending videos (Lec 3, 17, 18, 21)...")
    client = TelegramClient("bot_video_watcher", int(settings.TELEGRAM_API_ID), settings.TELEGRAM_API_HASH)
    await client.start(bot_token=settings.TELEGRAM_BOT_TOKEN)
    log("Telegram Bot client active.")

    completed_lecs = set()

    # Check initially if any already have a video in DB
    db = SessionLocal()
    for lid in list(LECTURES_WATCH.keys()):
        va = db.query(MediaAsset).filter(
            MediaAsset.lecture_id == lid,
            MediaAsset.asset_type == "video",
            MediaAsset.telegram_message_id != None
        ).first()
        if va:
            log(f"Lec #{lid} already has video TG #{va.telegram_message_id}")
            completed_lecs.add(lid)
    db.close()

    while len(completed_lecs) < len(LECTURES_WATCH):
        for lec_id, nb_id in LECTURES_WATCH.items():
            if lec_id in completed_lecs:
                continue

            # Check NotebookLM artifacts
            res = subprocess.run(
                ["notebooklm", "artifact", "list", "-n", nb_id, "--type", "video", "--json"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )
            if res.returncode == 0 and res.stdout:
                try:
                    data = json.loads(res.stdout)
                    for a in data.get("artifacts", []):
                        if a.get("status") == "completed":
                            art_id = a.get("id")
                            log(f"🎉 FOUND COMPLETED VIDEO for Lec #{lec_id}! Artifact ID: {art_id}")
                            out_path = os.path.join(TEMP_DIR, f"video_{lec_id}.mp4")
                            
                            # Download
                            dl_res = subprocess.run(
                                ["notebooklm", "download", "video", out_path, "-n", nb_id, "-a", art_id, "--force"],
                                capture_output=True,
                                text=True,
                                encoding="utf-8",
                                errors="ignore"
                            )
                            if os.path.exists(out_path) and os.path.getsize(out_path) > 1024:
                                log(f"Downloaded {out_path} ({os.path.getsize(out_path)} bytes). Uploading...")
                                await upload_video(client, lec_id, out_path)
                                completed_lecs.add(lec_id)
                                break
                            else:
                                log(f"Download output error: {dl_res.stderr} / {dl_res.stdout}")
                except Exception as e:
                    log(f"Error checking {nb_id}: {e}")

        if len(completed_lecs) < len(LECTURES_WATCH):
            log(f"Waiting 60s for remaining videos... Completed so far: {list(completed_lecs)}/{len(LECTURES_WATCH)}")
            time.sleep(60)

    log("🏆 ALL PENDING VIDEOS HAVE BEEN UPLOADED SUCCESSFULLY!")
    await client.disconnect()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
