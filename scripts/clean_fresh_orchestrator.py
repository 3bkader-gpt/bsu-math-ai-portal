#!/usr/bin/env python3
"""
Clean Fresh Parallel Multi-Account Orchestrator
Zero-Bandwidth Home Invariant: Heavy media transfer stays 100% in GitHub Actions.
"""
import os
import sys
import json
import asyncio
import logging
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path("/home/abkader/bsu-math-ai-portal")
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from app.db.database import SessionLocal
from app.db.models import Lecture, MediaAsset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("/home/abkader/clean_fresh_orchestrator.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("CleanFreshOrchestrator")

GITHUB_TOKEN = os.getenv("GITHUB_DISPATCH_TOKEN") or os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPOSITORY", "3bkader-gpt/bsu-math-ai-portal")

TASKS_BY_PROFILE = {
    "acc_mo": [
        {
            "lid": 52, "sub_name": "تدريس مصغر", "lnum": 6,
            "title": "مهارة الشرح والتفسير الرياضي وبطاقة ملاحظتها", "doctor": "د/ عبدالرحمن برعي",
            "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec6/كتاب - مهارة الشرح والتفسير الرياضي وبطاقة ملاحظتها.pdf"),
            "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
        }
    ],
    "acc_p1": [
        {
            "lid": 53, "sub_name": "تدريس مصغر", "lnum": 7,
            "title": "مهارة التواصل اللفظي وغير اللفظي وبطاقة ملاحظتها", "doctor": "د/ عبدالرحمن برعي",
            "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec7/كتاب - مهارة التواصل اللفظي وغير اللفظي وبطاقة ملاحظتها.pdf"),
            "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
        },
        {
            "lid": 61, "sub_name": "تكنولوجيا والتحول الرقمي", "lnum": 4,
            "title": "مستحدثات تكنولوجيا التعليم وخصائصها وتطبيقاتها المعاصرة", "doctor": "د/ ايمان",
            "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec4/كتاب - مستحدثات تكنولوجيا التعليم وخصائصها.pdf"),
            "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
        }
    ],
    "acc_p2": [
        {
            "lid": 55, "sub_name": "تدريس مصغر", "lnum": 9,
            "title": "مهارة التعزيز الصفي الإيجابي وبطاقة ملاحظتها", "doctor": "د/ عبدالرحمن برعي",
            "pdf_path": Path("/home/abkader/incoming_pdfs/microteaching/lec9/كتاب - مهارة التعزيز الصفي وبطاقة ملاحظتها.pdf"),
            "prompt_path": ROOT / "prompts" / "تدريس مصغر.txt"
        }
    ],
    "acc_passplay": [
        {
            "lid": 58, "sub_name": "تكنولوجيا والتحول الرقمي", "lnum": 1,
            "title": "مقدمة عن تكنولوجيا التعليم وتطورها التاريخي ومفاهيمها", "doctor": "د/ ايمان",
            "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec1/كتاب - مقدمة عن تكنولوجيا التعليم وتطورها.pdf"),
            "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
        }
    ],
    "acc_ali": [
        {
            "lid": 59, "sub_name": "تكنولوجيا والتحول الرقمي", "lnum": 2,
            "title": "التحول الرقمي في التعليم وأبعاده واستراتيجياته ونماذجه", "doctor": "د/ ايمان",
            "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec2/كتاب - التحول الرقمي في التعليم واستراتيجياته.pdf"),
            "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
        }
    ],
    "default": [
        {
            "lid": 60, "sub_name": "تكنولوجيا والتحول الرقمي", "lnum": 3,
            "title": "المواطنة الرقمية والوعي التكنولوجي وقواعد الاستخدام الآمن", "doctor": "د/ ايمان",
            "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec3/كتاب - المواطنة الرقمية وقواعد الاستخدام الآمن.pdf"),
            "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt"
        },
        {
            "lid": 63, "sub_name": "تكنولوجيا والتحول الرقمي", "lnum": 6,
            "title": "الذكاء الاصطناعي وتطبيقاته التعليمية وأخلاقياته", "doctor": "د/ ايمان",
            "pdf_path": Path("/home/abkader/incoming_pdfs/digital_transformation/lec6/كتاب - الذكاء الاصطناعي وتطبيقاته في التعليم.pdf"),
            "prompt_path": ROOT / "prompts" / "تكنولوجيا والتحول الرقمي.txt",
            "video_only": True
        }
    ]
}

def get_lecture_assets(lid: int) -> tuple[bool, bool]:
    with SessionLocal() as db:
        assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == lid).all()
        has_audio = any(a.telegram_message_id for a in assets if a.asset_type == "audio")
        has_video = any(a.telegram_message_id for a in assets if a.asset_type == "video")
        return has_audio, has_video

async def run_cmd(prof: str, args: list[str]) -> tuple[int, str]:
    cmd = ["/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm", "-p", prof] + args
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    out = (stdout.decode(errors="replace") + " " + stderr.decode(errors="replace")).strip()
    return proc.returncode, out

async def create_fresh_notebook(prof: str, task: dict) -> str:
    title = f"{task['sub_name']} ({task['doctor']}) - المحاضرة {task['lnum']}: {task['title']}"
    logger.info(f"[{prof}] 📘 Creating fresh notebook: {title}")
    code, out = await run_cmd(prof, ["create", title, "--json"])
    if code != 0:
        raise RuntimeError(f"Failed to create notebook: {out}")
    data = json.loads(out)
    nbid = data.get("notebook_id") or (data.get("notebook") or {}).get("id")
    if not nbid:
        raise RuntimeError(f"Could not parse notebook ID from: {out}")
    logger.info(f"[{prof}] ✅ Created notebook {nbid}. Uploading PDF source...")

    pdf = task["pdf_path"]
    code, out = await run_cmd(prof, ["source", "add", "-n", nbid, str(pdf)])
    if code != 0:
        raise RuntimeError(f"Failed to upload PDF: {out}")
    logger.info(f"[{prof}] 📄 Source PDF uploaded successfully to {nbid}")

    # Update DB with fresh notebook_id
    with SessionLocal() as db:
        lec = db.query(Lecture).filter(Lecture.id == task["lid"]).first()
        if lec:
            lec.notebook_id = nbid
            db.commit()

    return nbid

async def get_artifact_status(prof: str, nbid: str) -> tuple[str, str]:
    code, out = await run_cmd(prof, ["artifact", "list", "-n", nbid, "--json"])
    if code != 0:
        return "none", "none"
    try:
        data = json.loads(out)
        artifacts = data.get("artifacts", [])
        a_stat = "none"
        v_stat = "none"
        for art in artifacts:
            t = art.get("type", "").lower()
            s = art.get("status", "").lower()
            if "audio" in t and a_stat != "completed":
                a_stat = s
            if "video" in t and v_stat != "completed":
                v_stat = s
        return a_stat, v_stat
    except Exception:
        return "none", "none"

def dispatch_github_transfer(lid: int, nb_id: str, sub_name: str, lnum: int, title: str, doc: str, prof: str) -> str:
    jar_path = Path(f"/home/abkader/.notebooklm/profiles/{prof}/storage_state.json")
    if not jar_path.exists():
        raise RuntimeError(f"Storage state missing for {prof}")
    with open(jar_path, "r", encoding="utf-8") as f:
        jar = json.load(f)

    with SessionLocal() as db:
        res = db.execute(text("""
            INSERT INTO public.media_handoffs 
                (lecture_id, notebook_id, subject_name, lecture_num, lecture_title, doctor, cookie_jar)
            VALUES 
                (:lid, :nb, :subj, :lnum, :title, :doc, :jar)
            RETURNING id
        """), {
            "lid": lid, "nb": nb_id, "subj": sub_name, "lnum": lnum,
            "title": title, "doc": doc, "jar": json.dumps(jar)
        }).fetchone()
        db.commit()
        handoff_id = str(res[0])

    req = urllib.request.Request(
        f"https://api.github.com/repos/{GITHUB_REPO}/dispatches",
        data=json.dumps({"event_type": "media_transfer", "client_payload": {"handoff_id": handoff_id}}).encode(),
        headers={"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json", "User-Agent": "BSU-Cloud-Bridge"}
    )
    with urllib.request.urlopen(req) as resp:
        logger.info(f"[{prof}] 🚀 Dispatched handoff {handoff_id} to GitHub Actions! Status: {resp.status}")
    return handoff_id

async def process_account_tasks(prof: str, tasks: list[dict], stagger_delay: int = 0):
    if stagger_delay > 0:
        logger.info(f"[{prof}] ⏳ Waiting stagger delay {stagger_delay}s to keep home IP rate-limit clean...")
        await asyncio.sleep(stagger_delay)

    logger.info(f"✨ Started Cloud-Bridge Worker [{prof}] ({len(tasks)} tasks)")

    for task in tasks:
        lid = task["lid"]
        lnum = task["lnum"]
        sub_name = task["sub_name"]
        title = task["title"]
        doc = task["doctor"]
        video_only = task.get("video_only", False)

        has_audio, has_video = get_lecture_assets(lid)
        if (has_audio or video_only) and has_video:
            logger.info(f"[{prof}] ⏭️ {sub_name} Lec {lnum} already has required assets in DB, skipping.")
            continue

        logger.info(f"[{prof}] 🎯 Processing {sub_name} Lec {lnum} (Audio in DB: {has_audio}, Video in DB: {has_video})")

        # 1. Create a fresh notebook and upload PDF
        try:
            nbid = await create_fresh_notebook(prof, task)
        except Exception as e:
            logger.error(f"[{prof}] Failed to create fresh notebook for Lec {lnum}: {e}")
            continue

        # Cooldown after PDF upload
        await asyncio.sleep(12)

        # 2. Trigger Audio if needed
        if not has_audio and not video_only:
            logger.info(f"[{prof}] 🎧 Triggering Audio for {sub_name} Lec {lnum} on Google Cloud...")
            cmd = ["generate", "audio", "--length", "long", "-n", nbid]
            prompt = task.get("prompt_path")
            if prompt and prompt.exists():
                cmd.extend(["--prompt-file", str(prompt)])
            await run_cmd(prof, cmd)
            await asyncio.sleep(15)

        # 3. Trigger Video if needed
        if not has_video:
            logger.info(f"[{prof}] 🎬 Triggering Video for {sub_name} Lec {lnum} on Google Cloud...")
            cmd = ["generate", "video", "--format", "explainer", "-n", nbid]
            prompt = task.get("prompt_path")
            if prompt and prompt.exists():
                cmd.extend(["--prompt-file", str(prompt)])
            await run_cmd(prof, cmd)
            await asyncio.sleep(10)

        # 4. Polling loop: Wait until completed on Google and transfer via GitHub Actions
        dispatched = False
        for poll_idx in range(1, 60):  # 60 * 30s = 30 mins max per lecture
            has_audio_now, has_video_now = get_lecture_assets(lid)
            needed_audio = True if not video_only else False
            if (has_audio_now or not needed_audio) and has_video_now:
                logger.info(f"[{prof}] 🏆 {sub_name} Lec {lnum} verified 100% in DB via Cloud Transfer!")
                break

            a_stat, v_stat = await get_artifact_status(prof, nbid)
            logger.info(f"[{prof}] Poll {poll_idx}/60 on Lec {lnum}: Google Audio={a_stat}, Video={v_stat}")

            ready_audio = (a_stat == "completed") if needed_audio else True
            ready_video = (v_stat == "completed")

            if ready_audio and ready_video and not dispatched:
                logger.info(f"[{prof}] ☁️ All media ready on Google! Handoff to GitHub Actions (Zero home data)...")
                try:
                    dispatch_github_transfer(lid, nbid, sub_name, lnum, title, doc, prof)
                    dispatched = True
                except Exception as e:
                    logger.error(f"[{prof}] Dispatch failed: {e}")

            await asyncio.sleep(30)

        logger.info(f"[{prof}] Finished processing cycle for Lec {lnum}")

    logger.info(f"🏁 Worker [{prof}] finished all assigned tasks!")

async def main():
    logger.info("=========================================================")
    logger.info("🚀 Starting Clean Fresh Multi-Account Orchestrator")
    logger.info("=========================================================")

    # Kill any dangling background notebooklm CLI processes
    os.system("pkill -f 'notebooklm -p' 2>/dev/null || true")

    profiles = list(TASKS_BY_PROFILE.keys())
    # Stagger each worker start by 40s to avoid IP rate-limit spikes
    staggers = {prof: idx * 40 for idx, prof in enumerate(profiles)}

    workers = [
        process_account_tasks(prof, TASKS_BY_PROFILE[prof], staggers[prof])
        for prof in profiles
    ]
    await asyncio.gather(*workers)
    logger.info("🎉 All workers finished successfully!")

if __name__ == "__main__":
    asyncio.run(main())
