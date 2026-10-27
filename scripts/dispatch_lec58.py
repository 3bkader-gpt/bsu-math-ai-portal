import os, sys, json, urllib.request
from pathlib import Path
from dotenv import load_dotenv

load_dotenv("/home/abkader/bsu-math-ai-portal/.env")
sys.path.insert(0, "/home/abkader/bsu-math-ai-portal")

from sqlalchemy import text
from app.db.database import SessionLocal

prof = "acc_passplay"
lid = 58
nb_id = "0f9f65d5-5fd0-4489-96e8-18a8b14948dd"
sub_name = "تكنولوجيا والتحول الرقمي"
lnum = 1
title = "مقدمة عن تكنولوجيا التعليم وتطورها التاريخي ومفاهيمها"
doc = "د/ ايمان"

token = os.getenv("GITHUB_DISPATCH_TOKEN") or os.getenv("GITHUB_TOKEN")
repo = os.getenv("GITHUB_REPOSITORY", "3bkader-gpt/bsu-math-ai-portal")

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
    print(f"Created handoff: {handoff_id}")

req = urllib.request.Request(
    f"https://api.github.com/repos/{repo}/dispatches",
    data=json.dumps({"event_type": "media_transfer", "client_payload": {"handoff_id": handoff_id}}).encode(),
    headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json", "User-Agent": "BSU-Cloud-Bridge"}
)
try:
    with urllib.request.urlopen(req) as resp:
        print(f"🚀 Successfully dispatched handoff {handoff_id}! HTTP Status: {resp.status}")
except Exception as e:
    print(f"❌ Dispatch failed: {e}")
