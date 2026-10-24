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
    with SessionLocal() as db:
        if handoff_id:
            row = db.execute(text(
                "SELECT id, lecture_id, subject_name, lecture_num, lecture_title, doctor,"
                "       audio_url, video_url, cookie_jar, attempts"
                " FROM public.media_handoffs WHERE id = :hid"
            ), {"hid": handoff_id}).fetchone()
        else:
            row = db.execute(text(
                "SELECT id, lecture_id, subject_name, lecture_num, lecture_title, doctor,"
                "       audio_url, video_url, cookie_jar, attempts"
                " FROM public.media_handoffs WHERE status = 'pending'"
                " ORDER BY created_at ASC LIMIT 1"
            )).fetchone()
        if not row:
            return None
        return {
            "id": str(row[0]), "lecture_id": row[1], "subject_name": row[2],
            "lecture_num": row[3], "lecture_title": row[4], "doctor": row[5],
            "audio_url": row[6], "video_url": row[7], "cookie_jar": row[8],
            "attempts": row[9],
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


def google_cookie_header(jar: dict | None) -> str:
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


def download_media(url: str, dest: Path, jar: dict | None) -> Path:
    headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
    cookie_header = google_cookie_header(jar)
    if cookie_header:
        headers["Cookie"] = cookie_header
    with httpx.Client(timeout=DOWNLOAD_TIMEOUT, follow_redirects=True) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()
        body = resp.content
    if len(body) < MIN_MEDIA_BYTES:
        raise RuntimeError(
            f"Downloaded artifact too small ({len(body)} bytes) — likely an auth page, not media"
        )
    dest.write_bytes(body)
    logger.info("Downloaded %s -> %s bytes (datacenter bandwidth)", dest.name, len(body))
    return dest


async def transfer(handoff: dict):
    lecture_id = handoff["lecture_id"]
    temp_dir = Path(tempfile.mkdtemp(prefix=f"transfer_{lecture_id}_"))
    try:
        cap_base = dict(
            subject_name=handoff["subject_name"] or "",
            lecture_num=handoff["lecture_num"] or 0,
            title=handoff["lecture_title"] or f"المحاضرة {handoff['lecture_num']}",
            doctor=handoff["doctor"],
        )
        uploads = []
        if handoff["audio_url"]:
            audio = download_media(handoff["audio_url"], temp_dir / "audio_overview.m4a", handoff["cookie_jar"])
            cap = make_telegram_caption(cap_base["subject_name"], cap_base["lecture_num"],
                                        cap_base["title"], cap_base["doctor"],
                                        "🎧 بودكاست الشرح الصوتي بالمصرية")
            uploads.append((audio, "audio", "بودكاست الشرح الصوتي", cap))
        if handoff["video_url"]:
            video = download_media(handoff["video_url"], temp_dir / "video_overview.mp4", handoff["cookie_jar"])
            cap = make_telegram_caption(cap_base["subject_name"], cap_base["lecture_num"],
                                        cap_base["title"], cap_base["doctor"],
                                        "🎬 فيديو الشرح المرئي التفاعلي")
            uploads.append((video, "video", "فيديو الشرح التفاعلي", cap))

        if not uploads:
            raise RuntimeError("Handoff has neither audio nor video URL")

        for file_path, asset_type, title, caption in uploads:
            up = await telegram_storage.upload_asset(file_path, asset_type, caption)
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
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


async def main():
    handoff_id = sys.argv[1] if len(sys.argv) > 1 else None
    handoff = fetch_handoff(handoff_id)
    if not handoff:
        logger.info("No pending handoff — nothing to do")
        return
    logger.info("Processing handoff %s for lecture %s", handoff["id"], handoff["lecture_id"])
    mark_handoff(handoff["id"], "in_progress")
    try:
        await transfer(handoff)
        purge_handoff(handoff["id"])
        logger.info("Handoff %s transferred & purged", handoff["id"])
    except Exception as exc:  # noqa: BLE001
        logger.exception("Transfer failed for handoff %s", handoff["id"])
        mark_handoff(handoff["id"], "failed", str(exc)[:500])
        raise


if __name__ == "__main__":
    asyncio.run(main())
