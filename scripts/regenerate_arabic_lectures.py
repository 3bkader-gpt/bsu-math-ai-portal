"""Batch Arabic (ar_eg) Audit-Driven Regeneration Script.

Safely repairs broken, English, or Blank-PDF lectures across Batches A, B1, B2, and C
using strict Egyptian Arabic locks (--language ar_eg, NOTEBOOKLM_HL=ar_eg),
multimodal OCR companion injection (ensure_readable_sources), Replace-on-Success
DB updates (never touching original_pdf or lecture_progress), and automatic
account rotation across active NotebookLM profiles.

Usage (on AWS Lightsail):
    python scripts/regenerate_arabic_lectures.py --batch A --dry-run
    python scripts/regenerate_arabic_lectures.py --batch A --concurrency 2
    python scripts/regenerate_arabic_lectures.py --lectures 98
    python scripts/regenerate_arabic_lectures.py --batch all --concurrency 2
"""

import argparse
import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("regen_ar_eg")

from app.db.database import SessionLocal
from app.db.models import Lecture, MediaAsset, Subject
from app.services.notebooklm_client import run_notebooklm_cmd_async as run_cmd_async
from app.services.notebooklm_service import (
    DEFAULT_NOTEBOOKLM_LANGUAGE,
    FLASHCARDS_PROMPT_INSTRUCTIONS,
    MIND_MAP_INSTRUCTIONS,
    QUIZ_PROMPT_INSTRUCTIONS,
    build_study_guide_append,
    ensure_readable_sources,
    make_telegram_caption,
    wait_for_sources_ready,
)
from app.services.prompt_service import get_subject_prompt
from app.services.telegram_storage import telegram_storage
import home_worker

BATCH_A = [33, 43, 46, 85, 86, 87, 88, 98]
BATCH_B1 = [
    34, 35, 44, 45, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
    80, 81, 82, 83, 84, 89, 90, 91, 92, 93, 94, 95, 96, 97,
]
BATCH_B2 = list(range(47, 64))
BATCH_C = [1]

SKIP_AV_IDS = {1, 35}

_AR_WORD_RE = re.compile(r"[\u0600-\u06FF]{2,}")
_EN_WORD_RE = re.compile(r"\b[A-Za-z]{3,}\b")
_LATEX_RE = re.compile(r"\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)")

_HALLUCINATION_MARKERS = (
    "empty topic",
    "empty flashcards",
    "empty mind map",
    "source material synthesis",
    "source context synthesis",
    "virtual memory",
    "blank pdf",
)


def _count_ar_en_words(text: str) -> tuple[int, int]:
    cleaned = _LATEX_RE.sub(" ", text or "")
    # Ignore standard Markdown quiz headers and formatting tags
    cleaned = re.sub(r"(?:^|\n)##+\s+(?:Question|Card)\s+\d+", " ", cleaned)
    cleaned = re.sub(r"\*\*(?:Hint|Steps|Q|A):\*\*", " ", cleaned)
    return len(_AR_WORD_RE.findall(cleaned)), len(_EN_WORD_RE.findall(cleaned))


def is_clean_arabic_asset(asset_type: str, content: str | None) -> bool:
    """Returns True iff content exists, is not hallucinated/empty, and is predominantly Arabic."""
    txt = (content or "").strip()
    if len(txt) < 30:
        return False
    lower = txt.lower()
    if any(marker in lower for marker in _HALLUCINATION_MARKERS):
        return False

    if asset_type == "flashcards_md":
        if txt.startswith("{"):
            return False  # JSON-in-flashcards_md bug breaks frontend parser
        ar_w, en_w = _count_ar_en_words(txt)
        return ar_w >= 25 and ar_w >= en_w

    if asset_type == "quiz_md":
        ar_w, en_w = _count_ar_en_words(txt)
        return ("- [x]" in txt or "- [ ]" in txt) and ar_w >= 25 and ar_w >= en_w

    if asset_type == "study_guide_md":
        ar_w, en_w = _count_ar_en_words(txt)
        return ar_w >= 60 and ar_w >= en_w

    if asset_type == "mind_map_json":
        try:
            data = json.loads(txt)
        except Exception:
            return False
        if not isinstance(data, dict) or not data.get("children"):
            return False
        names: list[str] = []

        def _walk(node):
            if isinstance(node, dict):
                if node.get("name"):
                    names.append(str(node["name"]))
                for ch in node.get("children") or []:
                    _walk(ch)

        _walk(data)
        if len(names) < 3:
            return False
        ar_w, en_w = _count_ar_en_words(" ".join(names))
        return ar_w >= 4 and ar_w >= en_w

    return False


_OWNER_MAP: dict[str, str] = {}
_EDITOR_MAP: dict[str, str] = {}


async def _build_owner_maps():
    """Discovers true notebook ownership (`is_owner`) once across all active profiles."""
    _OWNER_MAP.clear()
    _EDITOR_MAP.clear()
    for acc in home_worker._active_pool_accounts():
        prof = acc["profile"]
        rc, out = await run_cmd_async(["notebooklm", "-p", prof, "list", "--json"], timeout=45, max_retries=1)
        if rc != 0 or not out:
            continue
        try:
            for item in json.loads(out).get("notebooks", []):
                nid = item.get("id")
                if not nid:
                    continue
                if item.get("is_owner") or str(item.get("role", "")).lower() == "owner":
                    _OWNER_MAP[nid] = prof
                elif nid not in _EDITOR_MAP:
                    _EDITOR_MAP[nid] = prof
        except Exception:
            pass
    logger.info("Indexed notebook ownership: %d owned, %d shared-editor", len(_OWNER_MAP), len(_EDITOR_MAP))


async def find_accessible_profile(nb_id: str) -> str | None:
    """Finds the true owner profile (preferred) or editor profile for `nb_id`."""
    if not nb_id:
        return None
    if nb_id in _OWNER_MAP:
        return _OWNER_MAP[nb_id]
    if nb_id in _EDITOR_MAP:
        return _EDITOR_MAP[nb_id]
    for acc in home_worker._active_pool_accounts():
        prof = acc["profile"]
        rc, _ = await run_cmd_async(["notebooklm", "-p", prof, "source", "list", "--json", "-n", nb_id], timeout=45, max_retries=1)
        if rc == 0:
            return prof
    return None


async def create_fresh_notebook_from_db(lecture_id: int, subject_name: str, lecture_num: int, doctor: str | None, profile: str, work_dir: Path) -> str:
    """Downloads original_pdf assets (HTTP URL, local file, or Telegram file_id) and creates a brand-new NotebookLM notebook."""
    with SessionLocal() as db:
        pdf_assets = db.query(MediaAsset).filter(
            MediaAsset.lecture_id == lecture_id,
            MediaAsset.asset_type == "original_pdf",
        ).order_by(MediaAsset.id).all()
        raw_sources = [
            (a.local_file_path, a.telegram_file_id, a.title or f"source_{idx}.pdf")
            for idx, a in enumerate(pdf_assets)
        ]

    resolved_sources: list[tuple[str | None, Path | None, str]] = []
    for lp, tg_id, p_title in raw_sources:
        if lp and str(lp).startswith("http"):
            resolved_sources.append((str(lp), None, p_title))
        elif lp and Path(str(lp)).exists():
            resolved_sources.append((None, Path(str(lp)), p_title))
        elif tg_id:
            tg_url = await telegram_storage.get_direct_download_url(str(tg_id))
            if tg_url:
                resolved_sources.append((tg_url, None, p_title))

    if not resolved_sources:
        raise RuntimeError(f"Lecture {lecture_id} has no accessible HTTP/local/Telegram original_pdf sources")

    title = f"{subject_name} ({doctor}) - المحاضرة {lecture_num} [AR]" if doctor else f"{subject_name} - المحاضرة {lecture_num} [AR]"
    rc, out = await run_cmd_async(["notebooklm", "-p", profile, "create", title, "--json"], timeout=60)
    if rc != 0:
        raise RuntimeError(f"notebooklm create failed on {profile}: {out}")
    nb_id = json.loads(out)["notebook"]["id"]
    _OWNER_MAP[nb_id] = profile
    logger.info("Lec %s: created fresh notebook %s on profile %s", lecture_id, nb_id, profile)

    for idx, (url, local_src, p_title) in enumerate(resolved_sources):
        clean_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", p_title).strip("_") or "source.pdf"
        if not clean_name.lower().endswith(".pdf"):
            clean_name += ".pdf"
        dest = work_dir / f"src_{idx}_{clean_name}"
        if url:
            home_worker.download_pdf(url, dest)
        elif local_src:
            shutil.copy2(local_src, dest)
        add_rc, add_out = await run_cmd_async(["notebooklm", "-p", profile, "source", "add", str(dest), "-n", nb_id], timeout=180)
        if add_rc != 0:
            raise RuntimeError(f"source add failed for {p_title}: {add_out}")

    await wait_for_sources_ready(nb_id, profile=profile, timeout_s=90)
    await ensure_readable_sources(nb_id, profile=profile, work_dir=work_dir, subject_name=subject_name)
    return nb_id


async def list_artifact_ids(nb_id: str, profile: str, art_type: str) -> set[str]:
    rc, out = await run_cmd_async(["notebooklm", "-p", profile, "artifact", "list", "--json", "-n", nb_id], timeout=45, max_retries=1)
    if rc != 0 or not out:
        return set()
    try:
        items = json.loads(out).get("artifacts", [])
        return {str(a.get("id")) for a in items if str(a.get("type", "")).lower() == art_type and a.get("id")}
    except Exception:
        return set()


async def wait_specific_media_artifact(
    nb_id: str,
    profile: str,
    art_type: str,
    known_old_ids: set[str],
    timeout_s: int = 1800,
) -> dict | None:
    """Polls until a NEWLY created artifact (not in known_old_ids) finishes cleanly."""
    deadline = asyncio.get_running_loop().time() + timeout_s
    while asyncio.get_running_loop().time() < deadline:
        rc, out = await run_cmd_async(["notebooklm", "-p", profile, "artifact", "list", "--json", "-n", nb_id], timeout=45, max_retries=1)
        if rc == 0 and out:
            try:
                items = [
                    a for a in json.loads(out).get("artifacts", [])
                    if str(a.get("type", "")).lower() == art_type
                ]
                candidates = [a for a in items if str(a.get("id")) not in known_old_ids]
                if not candidates and items:
                    candidates = items[-1:]
                for art in reversed(candidates):
                    status = str(art.get("status", "")).lower()
                    if status == "completed" or art.get("is_completed"):
                        return art
                    if status in ("failed", "error"):
                        logger.warning("%s artifact %s failed on %s", art_type, art.get("id"), nb_id)
                        return None
            except Exception:
                pass
        await asyncio.sleep(30)
    return None


def upsert_asset(
    lecture_id: int,
    asset_type: str,
    title: str,
    upload_res: dict,
    content_text: str | None = None,
):
    """Replace-on-Success update of MediaAsset row without dropping student progress."""
    with SessionLocal() as db:
        existing = db.query(MediaAsset).filter(
            MediaAsset.lecture_id == lecture_id,
            MediaAsset.asset_type == asset_type,
        ).first()
        if existing:
            existing.title = title
            if content_text is not None:
                existing.content_text = content_text
            if upload_res.get("local_file_path"):
                existing.local_file_path = upload_res.get("local_file_path")
            if upload_res.get("telegram_file_id"):
                existing.telegram_file_id = upload_res.get("telegram_file_id")
            if upload_res.get("telegram_message_id"):
                existing.telegram_message_id = upload_res.get("telegram_message_id")
            if upload_res.get("file_size"):
                existing.file_size_bytes = upload_res.get("file_size")
        else:
            db.add(MediaAsset(
                lecture_id=lecture_id,
                asset_type=asset_type,
                title=title,
                content_text=content_text,
                local_file_path=upload_res.get("local_file_path"),
                telegram_file_id=upload_res.get("telegram_file_id"),
                telegram_message_id=upload_res.get("telegram_message_id"),
                file_size_bytes=upload_res.get("file_size"),
            ))
        db.commit()


def _title_has_arabic(art: dict | None) -> bool:
    if not art:
        return False
    t = str(art.get("title") or "")
    return len(re.findall(r"[\u0600-\u06FF]", t)) >= 4


_DONE_STATE_FILE = Path.home() / ".notebooklm" / "regen_ar_av_done.json"


def _load_av_done() -> dict[int, set[str]]:
    """Loads completed Arabic A/V kinds per lecture ID, migrating legacy list format cleanly."""
    try:
        if _DONE_STATE_FILE.exists():
            raw = json.loads(_DONE_STATE_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, list):
                return {int(x): {"audio", "video"} for x in raw}
            if isinstance(raw, dict):
                return {int(k): set(v) for k, v in raw.items()}
    except Exception:
        pass
    return {}


def _mark_av_kind_done(lecture_id: int, kind: str):
    try:
        _DONE_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        done = _load_av_done()
        done.setdefault(int(lecture_id), set()).add(kind)
        serializable = {str(k): sorted(v) for k, v in sorted(done.items())}
        _DONE_STATE_FILE.write_text(json.dumps(serializable), encoding="utf-8")
    except Exception:
        pass


async def regenerate_lecture(lecture_id: int, force_fresh_nb: bool, skip_av: bool, dry_run: bool, profile_hint: str):
    with SessionLocal() as db:
        lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if not lec:
            logger.warning("Lecture %s not found in DB — skipping", lecture_id)
            return
        subject_name = lec.subject.name
        lecture_num = lec.lecture_num
        title = lec.title
        doctor = lec.doctor
        db_nb_id = lec.notebook_id
        assets = {a.asset_type: (a.content_text or "") for a in lec.assets}

    needed_texts = [
        atype for atype in ("quiz_md", "study_guide_md", "flashcards_md", "mind_map_json")
        if not is_clean_arabic_asset(atype, assets.get(atype))
    ]
    av_done_map = _load_av_done().get(lecture_id, set())
    need_audio = (not skip_av) and (lecture_id not in SKIP_AV_IDS) and ("audio" not in av_done_map)
    need_video = (not skip_av) and (lecture_id not in SKIP_AV_IDS) and ("video" not in av_done_map)
    need_av = need_audio or need_video

    if not needed_texts and not need_av:
        logger.info("Lec %s (%s #%s): already 100%% clean Arabic!", lecture_id, subject_name, lecture_num)
        return

    logger.info(
        "Plan Lec %2d | %s #%s | fresh_nb=%s | texts=%s | need_audio=%s | need_video=%s",
        lecture_id, subject_name, lecture_num, force_fresh_nb, needed_texts, need_audio, need_video,
    )
    if dry_run:
        return

    prompt_path = get_subject_prompt(subject_name)
    work_dir = Path(tempfile.mkdtemp(prefix=f"regen_{lecture_id}_"))
    try:
        owner_prof = await find_accessible_profile(db_nb_id or "")
        # In Batch A reuse an already-newly-created Arabic notebook on our own pool so partial audio/video resumes cleanly
        if force_fresh_nb and owner_prof and not needed_texts:
            # Verify this notebook isn't one of the old uncleaned Batch A notebooks by checking DB assets already passed
            nb_id = db_nb_id
        elif force_fresh_nb or not owner_prof:
            owner_prof = profile_hint
            nb_id = await create_fresh_notebook_from_db(lecture_id, subject_name, lecture_num, doctor, owner_prof, work_dir)
        else:
            nb_id = db_nb_id
            await ensure_readable_sources(nb_id, profile=owner_prof, work_dir=work_dir, subject_name=subject_name)

        is_true_owner = nb_id in _OWNER_MAP or force_fresh_nb
        # Spread text load round-robin when the true owner can share; otherwise use the accessible editor directly
        if is_true_owner and profile_hint and profile_hint != owner_prof:
            shared = await home_worker.ensure_notebook_shared_with_profile(nb_id, profile_hint, creator_profile=owner_prof)
            gen_prof = profile_hint if shared else owner_prof
        else:
            gen_prof = owner_prof
        p_flag = ["-p", gen_prof]

        # 1. Regenerate non-Arabic text artifacts cleanly
        if needed_texts:
            cmd_map = {
                "quiz_md": [
                    "notebooklm", *p_flag, "generate", "quiz", QUIZ_PROMPT_INSTRUCTIONS,
                    "--quantity", "more", "--wait", "--retry", "1", "-n", nb_id,
                ],
                "study_guide_md": [
                    "notebooklm", *p_flag, "generate", "report", "--format", "study-guide",
                    "--language", DEFAULT_NOTEBOOKLM_LANGUAGE,
                    "--append", build_study_guide_append(subject_name, doctor),
                    "--wait", "--retry", "1", "-n", nb_id,
                ],
                "flashcards_md": [
                    "notebooklm", *p_flag, "generate", "flashcards", FLASHCARDS_PROMPT_INSTRUCTIONS,
                    "--quantity", "more", "--wait", "--retry", "1", "-n", nb_id,
                ],
                "mind_map_json": [
                    "notebooklm", *p_flag, "generate", "mind-map", "--kind", "interactive",
                    "--language", DEFAULT_NOTEBOOKLM_LANGUAGE,
                    "--instructions", MIND_MAP_INSTRUCTIONS, "-n", nb_id,
                ],
            }
            jobs = [(t, cmd_map[t]) for t in needed_texts]
            results = await asyncio.gather(*(run_cmd_async(c, timeout=360) for _, c in jobs))
            failed = [(t, c) for (t, c), (rc, _) in zip(jobs, results) if rc != 0]
            if failed and is_true_owner:
                alt_profiles = [
                    a["profile"] for a in home_worker._active_pool_accounts()
                    if a["profile"] != gen_prof
                ]
                for fb in alt_profiles[:2]:
                    if not failed:
                        break
                    if await home_worker.ensure_notebook_shared_with_profile(nb_id, fb, creator_profile=owner_prof):
                        fb_res = await asyncio.gather(
                            *(run_cmd_async(["notebooklm", "-p", fb, *c[3:]], timeout=360) for _, c in failed)
                        )
                        failed = [(t, c) for (t, c), (rc, _) in zip(failed, fb_res) if rc != 0]

            meta = {
                "quiz_md": ("quiz", "quiz.md", "كويز المحاضرة", "📝 كويز تفاعلي وبنك الأسئلة الكامل"),
                "study_guide_md": ("report", "study_guide.md", "دليل دراسي وملخص", "📚 دليل دراسي وملخص شامل"),
                "flashcards_md": ("flashcards", "flashcards.md", "بطاقات تعليمية", "🃏 بطاقات استذكار تعليمية"),
                "mind_map_json": ("mind-map", "mind_map.json", "خريطة ذهنية", "🧠 خريطة ذهنية ومفاهيمية"),
            }
            for atype in needed_texts:
                kind, fname, asset_title, tg_label = meta[atype]
                dest = work_dir / fname
                dl_cmd = ["notebooklm", *p_flag, "download", kind, str(dest), "--force", "-n", nb_id]
                if kind in ("quiz", "flashcards"):
                    dl_cmd[5:5] = ["--format", "markdown"]
                dl_rc, _ = await run_cmd_async(dl_cmd, timeout=120)
                if (dl_rc != 0 or not dest.exists()) and gen_prof != owner_prof:
                    alt_dl = ["notebooklm", "-p", owner_prof, "download", kind, str(dest), "--force", "-n", nb_id]
                    if kind in ("quiz", "flashcards"):
                        alt_dl[5:5] = ["--format", "markdown"]
                    await run_cmd_async(alt_dl, timeout=120)
                if not dest.exists():
                    logger.warning("Lec %s: %s download failed", lecture_id, atype)
                    continue
                content = dest.read_text(encoding="utf-8", errors="replace")
                if not is_clean_arabic_asset(atype, content):
                    logger.warning("Lec %s: regenerated %s still failed Arabic check (len=%d) — keeping safe/retrying later", lecture_id, atype, len(content))
                    continue
                cap = make_telegram_caption(subject_name, lecture_num, title, doctor, tg_label)
                up = await telegram_storage.upload_asset(dest, atype, cap)
                upsert_asset(lecture_id, atype, asset_title, up, content_text=content)
                logger.info("Lec %s: updated %s cleanly (%d chars)", lecture_id, atype, len(content))

        # 2. Regenerate Audio + Video in Egyptian Arabic with real owner_prof sharing
        if need_av:
            old_audio_ids = await list_artifact_ids(nb_id, owner_prof, "audio") if need_audio else set()
            old_video_ids = await list_artifact_ids(nb_id, owner_prof, "video") if need_video else set()

            audio_ok = (
                await home_worker.launch_media(nb_id, "audio", prompt_path, creator_profile=owner_prof)
                if need_audio else False
            )
            if need_audio and need_video:
                await asyncio.sleep(15)
            video_ok = (
                await home_worker.launch_media(nb_id, "video", prompt_path, creator_profile=owner_prof)
                if need_video else False
            )

            async def _fetch_upload(kind: str, old_ids: set[str], raw_name: str, asset_type: str, asset_title: str, tg_label: str) -> bool:
                art = await wait_specific_media_artifact(nb_id, owner_prof, kind, old_ids, timeout_s=1800)
                if not art:
                    logger.warning("Lec %s: %s generation timed out or failed", lecture_id, kind)
                    return False
                if not _title_has_arabic(art):
                    logger.warning("Lec %s: regenerated %s has non-Arabic title (%r) — refusing to overwrite DB", lecture_id, kind, art.get("title"))
                    return False
                art_id = str(art["id"])
                out_path = work_dir / raw_name
                rc, dl_out = await run_cmd_async(
                    ["notebooklm", "-p", owner_prof, "download", kind, "-a", art_id, str(out_path), "--force", "-n", nb_id],
                    timeout=300,
                )
                if rc != 0 or not out_path.exists() or out_path.stat().st_size < 50_000:
                    logger.warning("Lec %s: %s download failed (%s)", lecture_id, kind, (dl_out or "")[:120])
                    return False
                final_path = out_path
                if kind == "audio":
                    mp3 = work_dir / "audio_overview.mp3"
                    r = subprocess.run(["ffmpeg", "-y", "-i", str(out_path), "-b:a", "64k", str(mp3)], capture_output=True)
                    if r.returncode == 0 and mp3.exists() and mp3.stat().st_size > 10_000:
                        final_path = mp3
                elif out_path.stat().st_size > 48 * 1024 * 1024:
                    comp = work_dir / "video_comp.mp4"
                    r = subprocess.run(
                        ["ffmpeg", "-y", "-i", str(out_path), "-vcodec", "libx264", "-crf", "28", "-preset", "fast", str(comp)],
                        capture_output=True,
                    )
                    if r.returncode == 0 and comp.exists() and comp.stat().st_size > 10_000:
                        final_path = comp

                cap = make_telegram_caption(subject_name, lecture_num, title, doctor, tg_label)
                up = await telegram_storage.upload_asset(final_path, asset_type, cap)
                if not str(up.get("storage_mode", "")).startswith("telegram"):
                    logger.error("Lec %s: %s Telegram upload failed (%s)", lecture_id, kind, up)
                    return False
                upsert_asset(lecture_id, asset_type, asset_title, up)
                _mark_av_kind_done(lecture_id, kind)
                logger.info("Lec %s: replaced %s cleanly (title=%r)", lecture_id, asset_type, art.get("title"))
                return True

            await asyncio.gather(
                _fetch_upload("audio", old_audio_ids, "audio_overview.m4a", "audio", "بودكاست الشرح الصوتي", "🎧 بودكاست الشرح الصوتي بالمصرية")
                if audio_ok else asyncio.sleep(0, result=False),
                _fetch_upload("video", old_video_ids, "video_overview.mp4", "video", "فيديو الشرح التفاعلي", "🎬 فيديو الشرح المرئي التفاعلي")
                if video_ok else asyncio.sleep(0, result=False),
            )

        # Save new notebook_id if a fresh notebook was created
        if nb_id != db_nb_id:
            with SessionLocal() as db:
                lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
                if lec:
                    lec.notebook_id = nb_id
                    db.commit()
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


async def run_queue(args):
    targets: list[tuple[int, bool]] = []
    if args.lectures:
        ids = [int(x.strip()) for x in args.lectures.split(",") if x.strip()]
        targets = [(i, i in BATCH_A or args.fresh_nb) for i in ids]
    else:
        if args.batch in ("A", "all"):
            targets.extend((i, True) for i in BATCH_A)
        if args.batch in ("B1", "all"):
            targets.extend((i, False) for i in BATCH_B1)
        if args.batch in ("B2", "all"):
            targets.extend((i, False) for i in BATCH_B2)
        if args.batch in ("C", "all"):
            targets.extend((i, False) for i in BATCH_C)

    profiles = [a["profile"] for a in home_worker._active_pool_accounts()] or ["default"]
    if not args.dry_run:
        await _build_owner_maps()
    sem = asyncio.Semaphore(max(1, args.concurrency))

    async def _worker(idx: int, lid: int, fresh: bool):
        async with sem:
            prof = profiles[idx % len(profiles)]
            try:
                await regenerate_lecture(lid, fresh, args.skip_av, args.dry_run, prof)
            except Exception:
                logger.exception("Lec %s regeneration raised", lid)

    await asyncio.gather(*(_worker(idx, lid, fresh) for idx, (lid, fresh) in enumerate(targets)))


def main():
    parser = argparse.ArgumentParser(description="Arabic ar_eg Lecture Regeneration Runner")
    parser.add_argument("--batch", choices=["A", "B1", "B2", "C", "all"], default="A")
    parser.add_argument("--lectures", default="", help="Comma-separated lecture IDs override")
    parser.add_argument("--fresh-nb", action="store_true", help="Force fresh notebook even outside Batch A")
    parser.add_argument("--skip-av", action="store_true", help="Regenerate text/mindmap assets only")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without modifying DB or NotebookLM")
    parser.add_argument("--concurrency", type=int, default=2, help="Max concurrent lectures")
    args = parser.parse_args()
    asyncio.run(run_queue(args))


if __name__ == "__main__":
    main()
