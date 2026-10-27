#!/usr/bin/env python3
"""
Lightweight Poller & Dispatcher for the 3 active notebooks:
- acc_passplay: Lec 4 (0bdb653f-1a4d-42d8-be9f-72fc7e77b166)
- acc_mo: Lec 2 (f194071d-72f3-4aaf-b909-6e4892d4852e)
- acc_p2: Lec 6 (ff398006-b977-4263-8479-ca705cb92204)

Watches without consuming quota/re-triggering until Google marks them completed,
then immediately triggers GitHub Actions data plane.
"""
import os, sys, json, time, urllib.request, logging, subprocess
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path("/home/abkader/bsu-math-ai-portal")
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from app.db.database import SessionLocal
from app.db.models import MediaAsset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("/home/abkader/monitor_remaining.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("MonitorRemaining")

GITHUB_TOKEN = os.getenv("GITHUB_DISPATCH_TOKEN") or os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPOSITORY", "3bkader-gpt/bsu-math-ai-portal")

TASKS = [
    {
        "prof": "default", "lid": 61, "lnum": 4,
        "nbid": "5b8a4c2d-2235-4a70-a282-e14fdbc78c02",
        "sub_name": "تكنولوجيا والتحول الرقمي", "title": "مستحدثات تكنولوجيا التعليم وخصائصها وتطبيقاتها المعاصرة",
        "doctor": "د/ ايمان", "video_only": False, "dispatched": False
    },
    {
        "prof": "acc_ali", "lid": 59, "lnum": 2,
        "nbid": "4242d865-246a-4a60-bace-d2ebffde643f",
        "sub_name": "تكنولوجيا والتحول الرقمي", "title": "التحول الرقمي في التعليم وأبعاده واستراتيجياته ونماذجه",
        "doctor": "د/ ايمان", "video_only": False, "dispatched": False
    },
    {
        "prof": "default", "lid": 63, "lnum": 6,
        "nbid": "e8821a21-aa90-44d7-91b9-23929a7d554b",
        "sub_name": "تكنولوجيا والتحول الرقمي", "title": "الذكاء الاصطناعي وتطبيقاته التعليمية وأخلاقياته",
        "doctor": "د/ ايمان", "video_only": True, "dispatched": False
    }
]

def check_db_assets(lid: int) -> tuple[bool, bool]:
    with SessionLocal() as db:
        assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == lid).all()
        has_a = any(a.telegram_message_id for a in assets if a.asset_type == "audio")
        has_v = any(a.telegram_message_id for a in assets if a.asset_type == "video")
        return has_a, has_v

def get_artifacts(prof: str, nbid: str) -> tuple[str, str]:
    cmd = ["/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm", "-p", prof, "artifact", "list", "-n", nbid, "--json"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        return "none", "none"
    try:
        data = json.loads(proc.stdout)
        artifacts = data.get("artifacts", [])
        a_stat, v_stat = "none", "none"
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

def dispatch(task: dict):
    prof = task["prof"]
    lid = task["lid"]
    nb_id = task["nbid"]
    sub_name = task["sub_name"]
    lnum = task["lnum"]
    title = task["title"]
    doc = task["doctor"]

    jar_path = Path(f"/home/abkader/.notebooklm/profiles/{prof}/storage_state.json")
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

def main():
    logger.info("📡 Starting persistent listener for remaining 3 notebooks...")
    loop_count = 0
    while True:
        loop_count += 1
        all_done = True
        for task in TASKS:
            lid = task["lid"]
            lnum = task["lnum"]
            prof = task["prof"]
            nbid = task["nbid"]
            video_only = task["video_only"]

            has_a, has_v = check_db_assets(lid)
            if (has_a or video_only) and has_v:
                continue

            all_done = False
            a_stat, v_stat = get_artifacts(prof, nbid)
            logger.info(f"[Poll {loop_count}] Lec {lnum} ({prof}): Audio={a_stat}, Video={v_stat} | In DB: a={has_a}, v={has_v}")

            audio_ok = (a_stat == "completed") or video_only or has_a
            video_ok = (v_stat == "completed") or has_v

            if audio_ok and video_ok and not task["dispatched"]:
                logger.info(f"✨ Lec {lnum} finished on Google! Initiating handoff to GitHub Actions...")
                try:
                    dispatch(task)
                    task["dispatched"] = True
                except Exception as e:
                    logger.error(f"Failed dispatch for Lec {lnum}: {e}")

        if all_done:
            logger.info("🎉 All 3 lectures are 100% COMPLETE in DB! Exiting listener.")
            break

        time.sleep(30)

if __name__ == "__main__":
    main()
