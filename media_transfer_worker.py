"""Data-Plane media transfer worker — runs on GitHub Actions (cloud VM).

Fetches a media_handoffs row written by the home Control Plane, downloads
the generated audio (.m4a) and video (.mp4) DIRECTLY from Google's artifact
URLs using the one-shot cookie jar (datacenter bandwidth, zero home usage),
uploads them to the Telegram storage channel, registers media_assets rows,
marks the lecture completed, and PURGES the handoff row (it carries
account-equivalent cookies).

Usage: python media_transfer_worker.py [handoff_id]
Env: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
     TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID
"""

import asyncio
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("media_transfer")

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

import httpx
from sqlalchemy import text

from app.db.database import SessionLocal
from app.db.models import Lecture, MediaAsset
from app.services.notebooklm_service import make_telegram_caption
from app.services.telegram_storage import telegram_storage

DOWNLOAD_TIMEOUT = 600.0
MIN_MEDIA_BYTES = 50_000  # a real m4a/mp4 is far larger; guards HTML error pages


def fetch_handoff(handoff_id: str | None) -> dict | None:
    cols = ("id, lecture_id, notebook_id, subject_name, lecture_num, lecture_title, doctor,"
            "       audio_url, video_url, cookie_jar, attempts")
    with SessionLocal() as db:
        if handoff_id:
            row = db.execute(text(
                f"SELECT {cols} FROM public.media_handoffs WHERE id = :hid"
            ), {"hid": handoff_id}).fetchone()
        else:
            row = db.execute(text(
                f"SELECT {cols} FROM public.media_handoffs WHERE status = 'pending'"
                " ORDER BY created_at ASC LIMIT 1"
            )).fetchone()
        if not row:
            return None
        return {
            "id": str(row[0]), "lecture_id": row[1], "notebook_id": row[2],
            "subject_name": row[3], "lecture_num": row[4], "lecture_title": row[5],
            "doctor": row[6], "audio_url": row[7], "video_url": row[8],
            "cookie_jar": row[9], "attempts": row[10],
        }


def mark_handoff(handoff_id: str, status: str, error: str | None = None):
    with SessionLocal() as db:
        db.execute(text(
            "UPDATE public.media_handoffs SET status = :s, error_message = :e,"
            " attempts = attempts + 1, updated_at = now() WHERE id = :id"
        ), {"s": status, "e": error, "id": handoff_id})
        db.commit()


def purge_handoff(handoff_id: str):
    """Credential purge — the cookie jar must not outlive consumption."""
    with SessionLocal() as db:
        db.execute(text("DELETE FROM public.media_handoffs WHERE id = :id"), {"id": handoff_id})
        db.commit()


def google_cookie_header(jar: dict | None) -> str:  # retained for URL-mode handoffs
    if not jar:
        return ""
    pairs = []
    for cookie in jar.get("cookies", []):
        name = cookie.get("name", "")
        value = cookie.get("value", "")
        domain = cookie.get("domain", "")
        if name and value and "google" in domain:
            pairs.append(f"{name}={value}")
    return "; ".join(pairs)


def _cli_download(kind: str, dest: Path, nb_id: str, state_file: Path) -> Path:
    """Download a media artifact via the notebooklm CLI using the one-shot
    cookie jar (fresh from the home plane, used within minutes). The CLI
    resolves Google's artifact URLs internally; nothing is stored locally
    beyond this disposable VM."""
    cmd = [
        "notebooklm", "--storage", str(state_file),
        "download", kind, str(dest), "--force", "-n", nb_id,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=DOWNLOAD_TIMEOUT)
    if proc.returncode != 0 or not dest.exists():
        raise RuntimeError(
            f"{kind} download failed (rc={proc.returncode}): {(proc.stdout or '')[-300:]}"
        )
    size = dest.stat().st_size
    if size < MIN_MEDIA_BYTES:
        raise RuntimeError(
            f"Downloaded {kind} too small ({size} bytes) — likely an auth page, not media"
        )
    logger.info("Downloaded %s -> %s bytes via CLI (datacenter bandwidth)", kind, size)
    return dest


async def transfer(handoff: dict):
    lecture_id = handoff["lecture_id"]
    nb_id = handoff.get("notebook_id")
    if not nb_id:
        raise RuntimeError("Handoff has no notebook_id")
    temp_dir = Path(tempfile.mkdtemp(prefix=f"transfer_{lecture_id}_"))
    state_file = temp_dir / "state.json"
    jar = handoff.get("cookie_jar")
    if isinstance(jar, str):
        jar = json.loads(jar)
    if jar:
        state_file.write_text(json.dumps(jar), encoding="utf-8")
    else:
        raise RuntimeError("Handoff cookie jar is empty — cannot download from Google")
    try:
        cap_base = dict(
            subject_name=handoff["subject_name"] or "",
            lecture_num=handoff["lecture_num"] or 0,
            title=handoff["lecture_title"] or f"المحاضرة {handoff['lecture_num']}",
            doctor=handoff["doctor"],
        )
        uploads = []
        try:
            audio = _cli_download("audio", temp_dir / "audio_overview.m4a", nb_id, state_file)
            # If audio > 45MB, transcode to 64k MP3 to guarantee fit under Telegram Bot API 50MB limit
            if audio.stat().st_size > 45 * 1024 * 1024:
                logger.info(f"Audio size {audio.stat().st_size} bytes > 45MB. Transcoding to 64k mp3 via ffmpeg...")
                mp3 = temp_dir / "audio_overview.mp3"
                res = subprocess.run(["ffmpeg", "-y", "-i", str(audio), "-b:a", "64k", str(mp3)], capture_output=True)
                if res.returncode == 0 and mp3.exists() and mp3.stat().st_size > 1000:
                    logger.info(f"Transcoded audio: {audio.stat().st_size} -> {mp3.stat().st_size} bytes")
                    audio = mp3

            cap = make_telegram_caption(cap_base["subject_name"], cap_base["lecture_num"],
                                        cap_base["title"], cap_base["doctor"],
                                        "🎧 بودكاست الشرح الصوتي بالمصرية")
            uploads.append((audio, "audio", "بودكاست الشرح الصوتي", cap))
        except Exception as e:
            logger.warning("Audio not ready or failed to download: %s", e)

        try:
            video = _cli_download("video", temp_dir / "video_overview.mp4", nb_id, state_file)
            # If video > 48MB, transcode to crf 28 to guarantee fit under Telegram Bot API 50MB limit
            if video.stat().st_size > 48 * 1024 * 1024:
                logger.info(f"Video size {video.stat().st_size} bytes > 48MB. Transcoding to compact mp4 via ffmpeg...")
                comp_mp4 = temp_dir / "video_overview_comp.mp4"
                res = subprocess.run(["ffmpeg", "-y", "-i", str(video), "-vcodec", "libx264", "-crf", "28", "-preset", "fast", str(comp_mp4)], capture_output=True)
                if res.returncode == 0 and comp_mp4.exists() and comp_mp4.stat().st_size > 1000:
                    logger.info(f"Transcoded video: {video.stat().st_size} -> {comp_mp4.stat().st_size} bytes")
                    video = comp_mp4

            cap = make_telegram_caption(cap_base["subject_name"], cap_base["lecture_num"],
                                        cap_base["title"], cap_base["doctor"],
                                        "🎬 فيديو الشرح المرئي التفاعلي")
            uploads.append((video, "video", "فيديو الشرح التفاعلي", cap))
        except Exception as e:
            logger.warning("Video not ready or failed to download: %s", e)

        if not uploads:
            raise RuntimeError("Neither audio nor video was successfully downloaded from Google.")

        for file_path, asset_type, title, caption in uploads:
            up = await telegram_storage.upload_asset(file_path, asset_type, caption)
            if not str(up.get("storage_mode", "")).startswith("telegram"):
                # Media bytes live on this disposable VM — a non-telegram
                # storage mode means the upload failed and the bytes are
                # unrecoverable after the runner dies. Fail loudly.
                raise RuntimeError(
                    f"{asset_type} upload fell back to {up.get('storage_mode')} "
                    f"(warning: {up.get('warning')}) — refusing to mark complete"
                )
            with SessionLocal() as db:
                existing = db.query(MediaAsset).filter(
                    MediaAsset.lecture_id == lecture_id,
                    MediaAsset.asset_type == asset_type,
                ).first()
                if existing:
                    existing.telegram_file_id = up.get("telegram_file_id")
                    existing.telegram_message_id = up.get("telegram_message_id")
                    existing.local_file_path = up.get("local_file_path")
                    existing.file_size_bytes = up.get("file_size")
                else:
                    db.add(MediaAsset(
                        lecture_id=lecture_id, asset_type=asset_type, title=title,
                        local_file_path=up.get("local_file_path"),
                        telegram_file_id=up.get("telegram_file_id"),
                        telegram_message_id=up.get("telegram_message_id"),
                        file_size_bytes=up.get("file_size"),
                    ))
                db.commit()
            logger.info("%s registered for lecture %s", asset_type, lecture_id)

        with SessionLocal() as db:
            lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            if lec:
                lec.status = "completed"
                lec.stage_info = "المحاضرة مكتملة 100% بجميع ملفاتها والشرح الصوتي ✅"
                lec.error_message = None
                db.commit()
        logger.info("Lecture %s marked completed", lecture_id)

        try:
            from app.services.notification_service import broadcast_new_lecture
            await broadcast_new_lecture(lecture_id)
        except Exception as n_exc:
            logger.warning("Could not broadcast notification for lecture %s: %s", lecture_id, n_exc)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


async def main():
    target_id = sys.argv[1] if len(sys.argv) > 1 else None
    while True:
        handoff = fetch_handoff(target_id)
        if not handoff:
            logger.info("No pending handoff — finished all!")
            break
        logger.info("Processing handoff %s for lecture %s", handoff["id"], handoff["lecture_id"])
        mark_handoff(handoff["id"], "in_progress")
        try:
            await transfer(handoff)
            purge_handoff(handoff["id"])
            logger.info("Handoff %s transferred & purged", handoff["id"])
        except Exception as exc:  # noqa: BLE001
            logger.exception("Transfer failed for handoff %s", handoff["id"])
            mark_handoff(handoff["id"], "failed", str(exc)[:500])
        if target_id:
            break


if __name__ == "__main__":
    asyncio.run(main())
