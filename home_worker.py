"""Control-Plane lecture worker — runs 24/7 on the home server (192.168.1.5).

Split-Plane architecture (see BLUEPRINT.md):
  This daemon owns everything that needs the residential IP / live Google
  session: polling the DB queue, driving NotebookLM (notebook, source,
  prompt, text artifacts), and handing media downloads over to the cloud
  Data Plane WITHOUT ever downloading audio/video bytes at home.

Environment (~/bsu-math-ai-portal/.env):
  DATABASE_URL              Supabase pooler URL (SQLAlchemy)
  SUPABASE_URL, SUPABASE_ANON_KEY
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, TELEGRAM_API_ID, TELEGRAM_API_HASH
  GITHUB_DISPATCH_TOKEN     PAT used ONLY to trigger the media_transfer Action
  GITHUB_REPO               default: 3bkader-gpt/bsu-math-ai-portal
  CHROME_PROFILE_DIR        default: /home/abkader/.notebooklm-profile
  NOTEBOOKLM_HEADLESS_REAUTH=1   (enables mid-RPC L3 recovery as backstop)
"""

import asyncio
import json
import logging
import os
import re
import shutil
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("home_worker")

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset
from app.services.notebooklm_service import (
    NotebookLMPipeline,
    make_telegram_caption,
)
from app.services.notebooklm_client import run_notebooklm_cmd_async as run_cmd_async
from app.services.telegram_storage import telegram_storage

PROMPTS_DIR = ROOT / "prompts"
CHROME_PROFILE_DIR = Path(os.getenv("CHROME_PROFILE_DIR", "/home/abkader/.notebooklm-profile"))
GITHUB_REPO = os.getenv("GITHUB_REPO", "3bkader-gpt/bsu-math-ai-portal")
GITHUB_DISPATCH_TOKEN = os.getenv("GITHUB_DISPATCH_TOKEN", "")
POLL_INTERVAL = 15
MEDIA_POLL_TIMEOUT = 45 * 60  # generous: audio "long" can take a while
POLL_STEP = 60


# ----------------------------------------------------------------------------
# Auth: keep the NotebookLM session alive from the residential IP
# ----------------------------------------------------------------------------

def clean_profile_locks():
    """Remove stale Chromium single-instance locks before driving the profile."""
    for name in ("SingletonLock", "SingletonSocket", "SingletonCookie"):
        target = CHROME_PROFILE_DIR / name
        try:
            if target.is_symlink() or target.exists():
                target.unlink()
                logger.info("Removed stale %s", name)
        except OSError as exc:
            logger.warning("Could not remove %s: %s", name, exc)


def headless_reauth() -> bool:
    """Re-mint dead cookies by driving SYSTEM Chrome against the owner's
    persistent profile (same Chrome binary that created it — no version
    mismatch). Returns True when fresh cookies were persisted."""
    clean_profile_locks()
    try:
        from notebooklm._browser.headless_reauth import attempt_headless_reauth
        from notebooklm.paths import get_storage_path

        storage = get_storage_path(None)
        result = attempt_headless_reauth(
            storage_path=storage,
            allow_headless=True,
            browser_profile=CHROME_PROFILE_DIR,
            browser="chrome",
        )
        status = getattr(result, "status", None)
        name = getattr(status, "name", str(status))
        logger.info("L3 headless reauth outcome: %s (%s)", name, getattr(result, "reason", ""))
        return name == "SUCCESS"
    except Exception as exc:  # noqa: BLE001 — daemon must never die on auth
        logger.error("Headless reauth raised: %s", exc)
        return False


async def session_alive() -> bool:
    code, out = await run_cmd_async(["notebooklm", "list", "--limit", "1"])
    blob = (out or "").lower()
    if code == 0 and "authentication error" not in blob and "csrf" not in blob:
        return True
    logger.warning("Session check failed: %s", (out or "")[:200])
    return False


async def ensure_session():
    if await session_alive():
        return
    logger.info("NotebookLM session dead — launching L3 headless reauth (system Chrome)...")
    if not headless_reauth():
        raise RuntimeError("NotebookLM session dead and L3 headless reauth failed")
    if not await session_alive():
        raise RuntimeError("L3 reauth reported success but session is still dead")


# ----------------------------------------------------------------------------
# DB helpers
# ----------------------------------------------------------------------------

def claim_next_lecture() -> dict | None:
    """Atomically claim the oldest 'queued' lecture (single-daemon safe)."""
    from sqlalchemy import text
    with SessionLocal() as db:
        row = db.execute(text("""
            UPDATE public.lectures SET status='processing',
                   stage_info='محرك المعالجة المنزلي التقط المحاضرة — جاري إنشاء النوتبوك 🧠',
                   updated_at=now()
            WHERE id = (SELECT id FROM public.lectures
                        WHERE status='queued' ORDER BY id ASC LIMIT 1 FOR UPDATE SKIP LOCKED)
            RETURNING id, subject_id, lecture_num, title, doctor, source_pdf_url
        """)).fetchone()
        db.commit()
        if not row:
            return None
        return {
            "id": row[0], "subject_id": row[1], "lecture_num": row[2],
            "title": row[3], "doctor": row[4], "source_pdf_url": row[5],
        }


def set_stage(lecture_id: int, status: str, stage: str, error: str | None = None):
    with SessionLocal() as db:
        lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if lec:
            lec.status = status
            lec.stage_info = stage
            lec.error_message = error
            db.commit()


def subject_name_for(subject_id: int) -> str:
    with SessionLocal() as db:
        subj = db.query(Subject).filter(Subject.id == subject_id).first()
        return subj.name if subj else ""


# ----------------------------------------------------------------------------
# NotebookLM control-plane steps
# ----------------------------------------------------------------------------

def download_pdf(url: str, dest: Path) -> Path:
    logger.info("Downloading source PDF: %s", url[:100])
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as resp, open(dest, "wb") as fh:
        shutil.copyfileobj(resp, fh)
    logger.info("PDF downloaded: %s bytes", dest.stat().st_size)
    return dest


def _extract_urls(node) -> list[str]:
    """Recursively collect http(s) URLs from an arbitrary JSON structure."""
    found: list[str] = []
    if isinstance(node, str):
        if node.startswith("http://") or node.startswith("https://"):
            found.append(node)
    elif isinstance(node, dict):
        for value in node.values():
            found.extend(_extract_urls(value))
    elif isinstance(node, list):
        for value in node:
            found.extend(_extract_urls(value))
    return found


async def artifact_download_url(nb_id: str, kind: str) -> str | None:
    """Return a direct download URL for the audio/video artifact, if ready.
    Never downloads media bytes — URL extraction only (Zero-Download)."""
    code, out = await run_cmd_async(
        ["notebooklm", "artifact", "list", "--type", kind, "--json", "-n", nb_id]
    )
    if code != 0 or not out:
        return None
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        return None
    entries = data if isinstance(data, list) else data.get("artifacts", data.get("items", []))
    if isinstance(entries, dict):
        entries = [entries]
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        status = str(entry.get("status", "")).upper()
        if status and status not in ("COMPLETED", "COMPLETE", "READY", "DONE"):
            continue
        for url in _extract_urls(entry):
            if any(host in url for host in ("googleusercontent", "google.com", "blob.core")):
                return url
    return None


async def wait_for_media_urls(nb_id: str) -> tuple[str | None, str | None]:
    deadline = time.monotonic() + MEDIA_POLL_TIMEOUT
    audio_url: str | None = None
    video_url: str | None = None
    while time.monotonic() < deadline and not (audio_url and video_url):
        if not audio_url:
            audio_url = await artifact_download_url(nb_id, "audio")
            if audio_url:
                logger.info("Audio artifact ready (URL captured, zero-download)")
        if not video_url:
            video_url = await artifact_download_url(nb_id, "video")
            if video_url:
                logger.info("Video artifact ready (URL captured, zero-download)")
        if audio_url and video_url:
            break
        await asyncio.sleep(POLL_STEP)
    return audio_url, video_url


def create_handoff(lecture: dict, nb_id: str, audio_url: str | None, video_url: str | None,
                   subject_name: str) -> str:
    """Persist the credential-bearing handoff row (service-role RLS only)."""
    from sqlalchemy import text
    jar = None
    storage = _storage_state_path()
    if storage and storage.exists():
        jar = json.loads(storage.read_text(encoding="utf-8"))
    with SessionLocal() as db:
        row = db.execute(text("""
            INSERT INTO public.media_handoffs
              (lecture_id, notebook_id, subject_name, lecture_num, lecture_title,
               doctor, audio_url, video_url, cookie_jar)
            VALUES (:lid, :nb, :subj, :lnum, :ltitle, :doc, :aurl, :vurl, :jar)
            RETURNING id
        """), {
            "lid": lecture["id"], "nb": nb_id, "subj": subject_name,
            "lnum": lecture["lecture_num"], "ltitle": lecture["title"],
            "doc": lecture["doctor"], "aurl": audio_url, "vurl": video_url,
            "jar": json.dumps(jar) if jar else None,
        }).fetchone()
        db.commit()
        return str(row[0])


def _storage_state_path() -> Path | None:
    try:
        from notebooklm.paths import get_storage_path
        return get_storage_path(None)
    except Exception:
        return None


def dispatch_data_plane(handoff_id: str) -> bool:
    if not GITHUB_DISPATCH_TOKEN:
        logger.error("GITHUB_DISPATCH_TOKEN missing — handoff queued but cloud not notified")
        return False
    payload = json.dumps({
        "event_type": "media_transfer",
        "client_payload": {"handoff_id": handoff_id},
    }).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/{GITHUB_REPO}/dispatches",
        data=payload,
        headers={
            "Authorization": f"Bearer {GITHUB_DISPATCH_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            logger.info("Data-Plane dispatched for handoff %s (HTTP %s)", handoff_id, resp.status)
            return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Dispatch failed: %s", exc)
        return False


# ----------------------------------------------------------------------------
# Lecture processing (Control Plane only — no media bytes at home)
# ----------------------------------------------------------------------------

async def process_lecture(lecture: dict):
    lecture_id = lecture["id"]
    subject_name = subject_name_for(lecture["subject_id"])
    if not subject_name:
        raise RuntimeError(f"Subject {lecture['subject_id']} not found")

    temp_dir = Path(tempfile.mkdtemp(prefix=f"lec_{lecture_id}_"))
    try:
        if not lecture["source_pdf_url"]:
            raise RuntimeError("Lecture has no source_pdf_url")
        pdf = download_pdf(lecture["source_pdf_url"], temp_dir / f"lecture_{lecture['lecture_num']}.pdf")

        await ensure_session()

        # 1. Notebook + source + original PDF asset (small Telegram upload)
        nb_id = await NotebookLMPipeline.create_notebook(
            f"{subject_name} - المحاضرة {lecture['lecture_num']}"
        )
        with SessionLocal() as db:
            lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            lec.notebook_id = nb_id
            db.commit()

        await NotebookLMPipeline.add_source(nb_id, pdf)
        cap = make_telegram_caption(subject_name, lecture["lecture_num"], lecture["title"],
                                    lecture["doctor"], "📄 ملف المحاضرة المعتمد", pdf.name)
        upload_res = await telegram_storage.upload_asset(pdf, "pdf", cap)
        with SessionLocal() as db:
            db.add(MediaAsset(
                lecture_id=lecture_id, asset_type="original_pdf", title=pdf.name,
                local_file_path=upload_res.get("local_file_path"),
                telegram_file_id=upload_res.get("telegram_file_id"),
                telegram_message_id=upload_res.get("telegram_message_id"),
                file_size_bytes=upload_res.get("file_size"),
            ))
            db.commit()

        # 2. Launch media generation in Google's cloud (no local bytes)
        set_stage(lecture_id, "processing",
                  "جاري توليد البودكاست والفيديو على سيرفرات جوجل + الكويز والملخص ☁️")
        prompt_file = PROMPTS_DIR / f"{subject_name}.txt"
        prompt_path = str(prompt_file) if prompt_file.exists() else None

        audio_cmd = ["notebooklm", "generate", "audio", "--length", "long", "-n", nb_id]
        video_cmd = ["notebooklm", "generate", "video", "--format", "explainer", "-n", nb_id]
        for cmd in (audio_cmd, video_cmd):
            if prompt_path:
                cmd.extend(["--prompt-file", prompt_path])
        await asyncio.gather(run_cmd_async(audio_cmd), run_cmd_async(video_cmd))

        # 3. Text artifacts (quiz / guide / flashcards / mind-map) — KB scale
        set_stage(lecture_id, "processing", "جاري توليد الكويز والملخص والبطاقات الذكية ✍️")
        quiz_cmd = ["notebooklm", "generate", "quiz",
                    "اختبار شامل مع تلميحات وشرح الإجابات", "--quantity", "more",
                    "--wait", "--retry", "3", "-n", nb_id]
        report_cmd = ["notebooklm", "generate", "report", "--format", "study-guide",
                      "--wait", "--retry", "3", "-n", nb_id]
        cards_cmd = ["notebooklm", "generate", "flashcards",
                     "أهم المفاهيم والقوانين والتعريفات", "--quantity", "more",
                     "--retry", "3", "-n", nb_id]
        map_cmd = ["notebooklm", "generate", "mind-map", "--kind", "note-backed", "-n", nb_id]
        await asyncio.gather(run_cmd_async(quiz_cmd), run_cmd_async(report_cmd),
                             run_cmd_async(cards_cmd), run_cmd_async(map_cmd))

        for kind, filename, asset_type, title, label in [
            ("quiz", "quiz.md", "quiz_md", "كويز المحاضرة", "📝 كويز تفاعلي وبنك الأسئلة الكامل"),
            ("report", "study_guide.md", "study_guide_md", "دليل دراسي وملخص", "📚 دليل دراسي وملخص شامل"),
            ("flashcards", "flashcards.md", "flashcards_md", "بطاقات تعليمية", "🃏 بطاقات استذكار تعليمية"),
            ("mind-map", "mind_map.json", "mind_map_json", "خريطة ذهنية", "🧠 خريطة ذهنية ومفاهيمية"),
        ]:
            dest = temp_dir / filename
            cmd = ["notebooklm", "download", kind, str(dest), "--force", "-n", nb_id]
            if kind == "quiz":
                cmd[3:3] = ["--format", "markdown"]
            await run_cmd_async(cmd)
            if not dest.exists():
                logger.warning("%s download missing for lec %s", kind, lecture_id)
                continue
            content = dest.read_text(encoding="utf-8", errors="replace")
            with SessionLocal() as db:
                existing = db.query(MediaAsset).filter(
                    MediaAsset.lecture_id == lecture_id,
                    MediaAsset.asset_type == asset_type,
                ).first()
                if existing:
                    existing.content_text = content
                    db.commit()
                    continue
                up = await telegram_storage.upload_asset(
                    dest, asset_type,
                    make_telegram_caption(subject_name, lecture["lecture_num"], lecture["title"],
                                          lecture["doctor"], label))
                db.add(MediaAsset(
                    lecture_id=lecture_id, asset_type=asset_type, title=title,
                    content_text=content,
                    local_file_path=up.get("local_file_path"),
                    telegram_file_id=up.get("telegram_file_id"),
                    telegram_message_id=up.get("telegram_message_id"),
                    file_size_bytes=up.get("file_size"),
                ))
                db.commit()

        # 4. Zero-Download handover: capture URLs only, wait for readiness
        set_stage(lecture_id, "processing",
                  "النصوص جاهزة ✅ — جاري انتظار اكتمال البودكاست والفيديو على جوجل ثم التسليم للسحابة ☁️")
        audio_url, video_url = await wait_for_media_urls(nb_id)
        if not audio_url and not video_url:
            raise RuntimeError("Media artifacts never became ready within timeout")

        handoff_id = create_handoff(lecture, nb_id, audio_url, video_url, subject_name)
        set_stage(lecture_id, "media_pending",
                  "تم تسليم الميديا لخط النقل السحابي — جاري رفعها لتليجرام من الداتا سنتر 🚀")
        if not dispatch_data_plane(handoff_id):
            logger.error("Handoff %s persisted; cloud dispatch failed (will retry next loop)",
                         handoff_id)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


async def redispatch_pending_handoffs():
    """Retry dispatch for handoffs whose cloud run never started."""
    from sqlalchemy import text
    with SessionLocal() as db:
        rows = db.execute(text("""
            SELECT id FROM public.media_handoffs
            WHERE status='pending' AND created_at < now() - interval '5 minutes'
            LIMIT 3
        """)).fetchall()
    for (handoff_id,) in rows:
        logger.info("Re-dispatching stale handoff %s", handoff_id)
        dispatch_data_plane(str(handoff_id))


async def main_loop():
    logger.info("🏠 Control-Plane home worker started (poll every %ss)", POLL_INTERVAL)
    while True:
        try:
            await redispatch_pending_handoffs()
            lecture = claim_next_lecture()
            if not lecture:
                await asyncio.sleep(POLL_INTERVAL)
                continue
            logger.info("Claimed lecture %s (%s lec %s)", lecture["id"],
                        subject_name_for(lecture["subject_id"]), lecture["lecture_num"])
            try:
                await process_lecture(lecture)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Lecture %s failed", lecture["id"])
                set_stage(lecture["id"], "failed", "فشلت المعالجة", str(exc)[:500])
        except Exception:  # noqa: BLE001 — the loop itself must survive
            logger.exception("Main loop error")
            await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main_loop())
