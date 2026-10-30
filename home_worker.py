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


def _extract_urls(node) -> list[str]:  # retained for future direct-URL handoff
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


async def artifact_state(nb_id: str, kind: str) -> str:
    """Returns 'completed', 'in_progress', or 'missing'."""
    code, out = await run_cmd_async(
        ["notebooklm", "artifact", "list", "--type", kind, "--json", "-n", nb_id]
    )
    if code != 0 or not out:
        return "missing"
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        return "missing"
    entries = data.get("artifacts", []) if isinstance(data, dict) else data
    for entry in entries:
        st = str(entry.get("status", "")).lower()
        if st == "completed":
            return "completed"
        if st in ("in_progress", "pending", "generating"):
            return "in_progress"
    return "missing"


async def launch_media(nb_id: str, kind: str, prompt_path: str | None) -> bool:
    if kind == "audio":
        cmd = ["notebooklm", "generate", "audio", "--length", "long", "--retry", "1", "-n", nb_id]
    else:
        cmd = ["notebooklm", "generate", "video", "--format", "explainer", "--retry", "1", "-n", nb_id]
    if prompt_path:
        cmd.extend(["--prompt-file", prompt_path])
    code, out = await run_cmd_async(cmd)
    if code == 0:
        logger.info("Launched %s generation for notebook %s", kind, nb_id)
        return True
    logger.warning("Launch %s for notebook %s returned code %s: %s", kind, nb_id, code, (out or "")[:150])
    return False


async def wait_for_media_ready(nb_id: str, prompt_path: str | None = None,
                               lecture_id: int | None = None) -> tuple[bool, bool]:
    audio_ready = False
    video_ready = False
    last_action_time = time.monotonic()

    while True:
        # Check audio
        if not audio_ready:
            st_audio = await artifact_state(nb_id, "audio")
            if st_audio == "completed":
                audio_ready = True
                logger.info("Audio artifact COMPLETED in Google (zero-download)")
            elif st_audio == "missing":
                logger.info("Audio missing for notebook %s — attempting kickoff...", nb_id)
                if await launch_media(nb_id, "audio", prompt_path):
                    last_action_time = time.monotonic()
                await asyncio.sleep(5)
            elif st_audio == "in_progress":
                last_action_time = time.monotonic()

        # Check video
        if not video_ready:
            st_video = await artifact_state(nb_id, "video")
            if st_video == "completed":
                video_ready = True
                logger.info("Video artifact COMPLETED in Google (zero-download)")
            elif st_video == "missing":
                logger.info("Video missing for notebook %s — attempting kickoff...", nb_id)
                if await launch_media(nb_id, "video", prompt_path):
                    last_action_time = time.monotonic()
                await asyncio.sleep(5)
            elif st_video == "in_progress":
                last_action_time = time.monotonic()

        if audio_ready and video_ready:
            break

        if lecture_id:
            st_a = "جاهز ✅" if audio_ready else "جاري التوليد / انتظار نافذة الكوتا السحابية ⏳"
            st_v = "جاهز ✅" if video_ready else "جاري التوليد / انتظار نافذة الكوتا السحابية ⏳"
            set_stage(lecture_id, "processing", f"النصوص مكتملة ✅ | الصوت: {st_a} | الفيديو: {st_v}")

        # Guard against absolute hang with zero progress for 3 hours
        if time.monotonic() - last_action_time > 3 * 3600:
            raise RuntimeError("Media generation made no progress for 3 hours")

        await asyncio.sleep(POLL_STEP)

    return audio_ready, video_ready


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

    prompt_file = PROMPTS_DIR / f"{subject_name}.txt"
    prompt_path = str(prompt_file) if prompt_file.exists() else None

    temp_dir = Path(tempfile.mkdtemp(prefix=f"lec_{lecture_id}_"))
    try:
        await ensure_session()

        # Resume support: if a notebook already exists for this lecture, skip
        # regeneration of notebook/source/texts and go straight to media wait.
        TEXT_ASSET_TYPES = ("quiz_md", "study_guide_md", "flashcards_md", "mind_map_json")
        with SessionLocal() as db:
            lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
            nb_id = lec.notebook_id if lec else None
            existing_types = {
                row[0] for row in db.query(MediaAsset.asset_type).filter(
                    MediaAsset.lecture_id == lecture_id
                ).all()
            }

        texts_complete = all(t in existing_types for t in TEXT_ASSET_TYPES)
        if nb_id and texts_complete:
            logger.info("Lecture %s already has notebook %s with all text assets — resuming at media wait",
                        lecture_id, nb_id)
        elif nb_id and not lecture["source_pdf_url"]:
            raise RuntimeError("Lecture has neither a notebook nor source_pdf_url")
        else:
            with SessionLocal() as db:
                pdf_assets = db.query(MediaAsset).filter(
                    MediaAsset.lecture_id == lecture_id,
                    MediaAsset.asset_type == "original_pdf"
                ).all()
                pdf_sources = []
                for p_asset in pdf_assets:
                    if p_asset.local_file_path and p_asset.local_file_path.startswith("http"):
                        pdf_sources.append((p_asset.local_file_path, p_asset.title or "source.pdf"))
                if not pdf_sources and lecture.get("source_pdf_url"):
                    pdf_sources.append((lecture["source_pdf_url"], f"lecture_{lecture['lecture_num']}.pdf"))

            if not pdf_sources:
                raise RuntimeError("Lecture has no source PDF files")

            # 1. Notebook + sources
            nb_id = await NotebookLMPipeline.create_notebook(
                f"{subject_name} - المحاضرة {lecture['lecture_num']}"
            )
            with SessionLocal() as db:
                lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
                lec.notebook_id = nb_id
                db.commit()

            for idx, (p_url, p_title) in enumerate(pdf_sources):
                clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', p_title)
                dest = temp_dir / f"src_{idx}_{clean_name}"
                download_pdf(p_url, dest)
                logger.info("Adding source %d/%d (%s) to notebook %s...", idx + 1, len(pdf_sources), p_title, nb_id)
                await NotebookLMPipeline.add_source(nb_id, dest)

            # 2. Launch media generation in Google's cloud with rate-limit awareness
            set_stage(lecture_id, "processing",
                      "جاري توليد البودكاست والفيديو على سيرفرات جوجل + الكويز والملخص ☁️")

            # Launch Audio
            audio_cmd = ["notebooklm", "generate", "audio", "--length", "long", "--retry", "3", "-n", nb_id]
            if prompt_path:
                audio_cmd.extend(["--prompt-file", prompt_path])
            await run_cmd_async(audio_cmd)
            await asyncio.sleep(15)  # Spacing cooldown before requesting video

            # Launch Video with CLI retry & rate-limit handling
            video_cmd = ["notebooklm", "generate", "video", "--format", "explainer", "--retry", "3", "-n", nb_id]
            if prompt_path:
                video_cmd.extend(["--prompt-file", prompt_path])
            v_code, v_out = await run_cmd_async(video_cmd)
            if v_code != 0:
                logger.warning(f"Video launch returned code {v_code} for lecture {lecture_id}: {v_out[:200]}")

            # 3. Text artifacts (quiz / guide / flashcards / mind-map) — KB scale
            set_stage(lecture_id, "processing", "جاري توليد الكويز والملخص والبطاقات الذكية ✍️")
            quiz_cmd = ["notebooklm", "generate", "quiz",
                        "اختبار شامل مع تلميحات وشرح الإجابات. "
                        "لكل سؤال أضف بعد الخيارات سطر Hint بإجابة صغيرة، "
                        "وأسفل الهينت بلوك Steps فيه خطوات الحل النموذجي مرقمة (3 إلى 5 خطوات) "
                        "بحيث يتعلم الطالب من التدرج خطوة خطوة", "--quantity", "more",
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

        # 4. Zero-Download handover: wait for Google-side readiness only
        set_stage(lecture_id, "processing",
                  "النصوص جاهزة ✅ — جاري انتظار اكتمال البودكاست والفيديو على جوجل ثم التسليم للسحابة ☁️")
        audio_ready, video_ready = await wait_for_media_ready(nb_id, prompt_path, lecture_id)
        if not audio_ready and not video_ready:
            raise RuntimeError("Media artifacts never became ready within timeout")

        handoff_id = create_handoff(lecture, nb_id, None, None, subject_name)
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
