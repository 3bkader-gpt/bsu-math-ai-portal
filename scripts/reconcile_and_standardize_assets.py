"""
Unified Reconciler & Standardizer for Lecture Resources.
Enforces the 5-Modality Standard across all subjects and lectures:
1. Audio (audio)
2. Video (video)
3. Quiz (quiz_md)
4. Study Guide (study_guide_md)
5. Flashcards (flashcards_md)
"""
import sys
import os
import io
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import argparse
import asyncio
import json
import logging
import subprocess
import time
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset
from app.services.telegram_storage import telegram_storage
from app.services.notebooklm_service import make_telegram_caption

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("Standardizer")

def run_cmd(args: list[str]) -> tuple[int, str]:
    """Runs a shell command synchronously and returns code, output."""
    try:
        proc = subprocess.run(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        return proc.returncode, proc.stdout
    except Exception as e:
        return 1, str(e)

async def run_cmd_async(args: list[str]) -> tuple[int, str]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, run_cmd, args)

def get_notebook_artifacts(nb_id: str) -> list[dict]:
    """Fetches artifacts list for a notebook via CLI JSON output."""
    if not nb_id:
        return []
    code, out = run_cmd(["notebooklm", "artifact", "list", "-n", nb_id, "--json"])
    if code == 0:
        try:
            data = json.loads(out)
            return data.get("artifacts", [])
        except Exception:
            pass
    return []

def audit_all():
    """Prints a structured audit of all lectures and their resources."""
    with SessionLocal() as db:
        lectures = db.query(Lecture).join(Subject).order_by(Subject.name, Lecture.lecture_num).all()
        print(f"\n=======================================================================")
        print(f"📊 فحص وتدقيق مصادر المحاضرات الـ 21 (المعيار الموحد: 5 مصادر لكل محاضرة)")
        print(f"=======================================================================\n")
        
        tier_counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0}
        
        for l in lectures:
            assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == l.id).all()
            types = set(a.asset_type for a in assets)
            
            has_audio = 'audio' in types
            has_video = 'video' in types
            has_quiz = 'quiz_md' in types
            has_guide = 'study_guide_md' in types
            has_cards = 'flashcards_md' in types or 'flashcards_json' in types
            
            score = sum([has_audio, has_video, has_quiz, has_guide, has_cards])
            tier_counts[score] += 1
            
            missing = []
            if not has_audio: missing.append("🎧 بودكاست")
            if not has_video: missing.append("🎬 فيديو")
            if not has_quiz: missing.append("📝 كويز")
            if not has_guide: missing.append("📖 دليل")
            if not has_cards: missing.append("🪞 فلاش كاردز")
            
            status_symbol = "✅" if score == 5 else ("⏳" if score > 0 else "❌")
            missing_str = " | ناقص: " + ", ".join(missing) if missing else " | مكتمل 100%"
            
            print(f"[{l.id:2d}] {status_symbol} {score}/5 | {l.subject.name} - م{l.lecture_num} ({l.doctor or 'بدون دكتور'}){missing_str}")
            print(f"     الدفتر: {l.notebook_id or 'لا يوجد'} | الحالة في المنصة: {l.status}\n")

        print("-----------------------------------------------------------------------")
        print(f"إجمالي المحاضرات المكتملة 5/5: {tier_counts[5]}")
        print(f"محاضرات 4/5 (ينقصها فيديو أو فلاش كاردز فقط): {tier_counts[4]}")
        print(f"محاضرات 2/5 إلى 3/5: {tier_counts[3] + tier_counts[2]}")
        print(f"محاضرات غير معالجة 0/5: {tier_counts[0]}")
        print("-----------------------------------------------------------------------\n")

async def retry_all_failed():
    """Finds all failed artifacts across all lecture notebooks and retries them."""
    with SessionLocal() as db:
        lectures = db.query(Lecture).filter(Lecture.notebook_id.isnot(None)).all()
        print(f"\n🔄 جاري فحص وإعادة تشغيل جميع العناصر المتعثرة عبر الدفاتر...")
        
        for l in lectures:
            nb_id = l.notebook_id
            if not nb_id:
                continue
            artifacts = get_notebook_artifacts(nb_id)
            for art in artifacts:
                if art.get("status") == "failed":
                    art_id = art.get("id")
                    art_type = art.get("type")
                    print(f"  -> إعادة تشغيل {art_type} ({art_id[:8]}) للمحاضرة {l.id} ({l.title})...")
                    c, out = await run_cmd_async(["notebooklm", "artifact", "retry", art_id, "-n", nb_id])
                    if c == 0:
                        print(f"     ✓ تم الإطلاق بنجاح!")
                    else:
                        print(f"     ! خطأ: {out.strip()}")
                    await asyncio.sleep(1)

async def trigger_missing_generation():
    """
    For any lecture with missing modalities (especially 0/5 lectures),
    triggers generation for the missing types if not already running or completed.
    """
    with SessionLocal() as db:
        lectures = db.query(Lecture).filter(Lecture.notebook_id.isnot(None)).all()
        print(f"\n🚀 جاري فحص وإطلاق التوليد للمصادر الناقصة لكل المحاضرات...")
        
        for l in lectures:
            nb_id = l.notebook_id
            if not nb_id:
                continue
                
            assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == l.id).all()
            existing_types = set(a.asset_type for a in assets)
            
            artifacts = get_notebook_artifacts(nb_id)
            art_status = {}
            for art in artifacts:
                t_id = art.get("type_id", "").lower()
                status = art.get("status", "").lower()
                art_status[t_id] = status
                
            # 1. Quiz
            if 'quiz_md' not in existing_types and art_status.get('quiz') not in ['completed', 'in_progress']:
                print(f"  [Lec {l.id}] إطلاق توليد الكويز...")
                await run_cmd_async(["notebooklm", "generate", "quiz", "اختبار شامل مع تلميحات وشرح الإجابات", "--quantity", "more", "--retry", "2", "-n", nb_id])
                await asyncio.sleep(2)
                
            # 2. Study Guide
            if 'study_guide_md' not in existing_types and art_status.get('report') not in ['completed', 'in_progress']:
                print(f"  [Lec {l.id}] إطلاق توليد الدليل الدراسي...")
                await run_cmd_async(["notebooklm", "generate", "report", "--format", "study-guide", "--retry", "2", "-n", nb_id])
                await asyncio.sleep(2)
                
            # 3. Flashcards
            has_fc = 'flashcards_md' in existing_types or 'flashcards_json' in existing_types
            if not has_fc and art_status.get('flashcards') not in ['completed', 'in_progress']:
                print(f"  [Lec {l.id}] إطلاق توليد بطاقات الاستذكار...")
                await run_cmd_async(["notebooklm", "generate", "flashcards", "أهم المفاهيم والقوانين والتعريفات", "--quantity", "more", "--retry", "2", "-n", nb_id])
                await asyncio.sleep(2)
                
            # 4. Audio
            if 'audio' not in existing_types and art_status.get('audio') not in ['completed', 'in_progress']:
                print(f"  [Lec {l.id}] إطلاق توليد البودكاست الصوتي...")
                await run_cmd_async(["notebooklm", "generate", "audio", "اشرح المحاضرة بالتفصيل وباللهجة المصرية وركز على القوانين وخطوات الحل", "--length", "long", "--retry", "2", "-n", nb_id])
                await asyncio.sleep(3)
                
            # 5. Video
            if 'video' not in existing_types and art_status.get('video') not in ['completed', 'in_progress']:
                print(f"  [Lec {l.id}] إطلاق توليد الفيديو التعليمي...")
                await run_cmd_async(["notebooklm", "generate", "video", "فيديو تعليمي تفاعلي يشرح القوانين والمسائل خطوة بخطوة بالعامية المصرية", "--format", "explainer", "--retry", "2", "-n", nb_id])
                await asyncio.sleep(3)

async def sync_completed_assets():
    """
    Downloads any completed artifacts from NotebookLM that are not yet stored in Supabase,
    uploads them to Telegram, and inserts them into MediaAsset.
    """
    temp_dir = ROOT_DIR / "media_storage" / "sync_temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    with SessionLocal() as db:
        lectures_raw = db.query(Lecture).join(Subject).filter(Lecture.notebook_id.isnot(None)).all()
        lec_items = []
        for l in lectures_raw:
            assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == l.id).all()
            lec_items.append({
                "id": l.id,
                "notebook_id": l.notebook_id,
                "lecture_num": l.lecture_num,
                "title": l.title,
                "doctor": l.doctor,
                "subject_name": l.subject.name if l.subject else "عام",
                "existing_types": set(a.asset_type for a in assets)
            })
            
    print(f"\n📥 جاري مزامنة وتنزيل المخرجات المكتملة وربطها بقاعدة البيانات وتيليجرام...")
    for item in lec_items:
        nb_id = item["notebook_id"]
        lec_id = item["id"]
        lecture_num = item["lecture_num"]
        title = item["title"]
        doctor = item["doctor"]
        subject_name = item["subject_name"]
        existing_types = item["existing_types"]
        
        artifacts = get_notebook_artifacts(nb_id)
        for art in artifacts:
            t_id = art.get("type_id", "").lower()
            status = art.get("status", "").lower()
            art_id = art.get("id")
            
            if status != "completed":
                continue
                
            # 1. Audio
            if t_id == "audio" and "audio" not in existing_types:
                dest = temp_dir / f"audio_{lec_id}.m4a"
                c, _ = await run_cmd_async(["notebooklm", "download", "audio", str(dest), "--force", "-n", nb_id])
                if c == 0 and dest.exists() and dest.stat().st_size > 1000:
                    cap = make_telegram_caption(subject_name, lecture_num, title, doctor, "🎧 بودكاست الشرح الصوتي بالمصرية")
                    res = await telegram_storage.upload_asset(dest, "audio", cap)
                    with SessionLocal() as save_db:
                        save_db.add(MediaAsset(
                            lecture_id=lec_id, asset_type="audio", title="بودكاست الشرح الصوتي",
                            local_file_path=res.get("local_file_path"),
                            telegram_file_id=res.get("telegram_file_id"),
                            telegram_message_id=res.get("telegram_message_id"),
                            file_size_bytes=res.get("file_size")
                        ))
                        lec = save_db.query(Lecture).filter(Lecture.id == lec_id).first()
                        if lec:
                            lec.stage_info = "تم إضافة البودكاست الصوتي بنجاح ✅"
                            lec.status = "completed"
                        save_db.commit()
                    existing_types.add("audio")
                    print(f"  ✓ [Lec {lec_id}] تم تنزيل ورفع البودكاست الصوتي بنجاح!")
                    dest.unlink(missing_ok=True)
                    
            # 2. Video
            elif t_id == "video" and "video" not in existing_types:
                dest = temp_dir / f"video_{lec_id}.mp4"
                c, _ = await run_cmd_async(["notebooklm", "download", "video", str(dest), "--force", "-n", nb_id])
                if c == 0 and dest.exists() and dest.stat().st_size > 1000:
                    cap = make_telegram_caption(subject_name, lecture_num, title, doctor, "🎬 فيديو الشرح المرئي التفاعلي")
                    res = await telegram_storage.upload_asset(dest, "video", cap)
                    with SessionLocal() as save_db:
                        save_db.add(MediaAsset(
                            lecture_id=lec_id, asset_type="video", title="فيديو الشرح التفاعلي",
                            local_file_path=res.get("local_file_path"),
                            telegram_file_id=res.get("telegram_file_id"),
                            telegram_message_id=res.get("telegram_message_id"),
                            file_size_bytes=res.get("file_size")
                        ))
                        lec = save_db.query(Lecture).filter(Lecture.id == lec_id).first()
                        if lec:
                            lec.status = "completed"
                        save_db.commit()
                    existing_types.add("video")
                    print(f"  ✓ [Lec {lec_id}] تم تنزيل ورفع الفيديو بنجاح!")
                    dest.unlink(missing_ok=True)

            # 3. Quiz
            elif t_id == "quiz" and "quiz_md" not in existing_types:
                dest = temp_dir / f"quiz_{lec_id}.md"
                c, _ = await run_cmd_async(["notebooklm", "download", "quiz", "--format", "markdown", str(dest), "--force", "-n", nb_id])
                if c == 0 and dest.exists():
                    txt = dest.read_text(encoding="utf-8", errors="replace")
                    cap = make_telegram_caption(subject_name, lecture_num, title, doctor, "📝 كويز تفاعلي وبنك الأسئلة الكامل")
                    res = await telegram_storage.upload_asset(dest, "quiz_md", cap)
                    with SessionLocal() as save_db:
                        save_db.add(MediaAsset(
                            lecture_id=lec_id, asset_type="quiz_md", title="كويز المحاضرة",
                            content_text=txt,
                            local_file_path=res.get("local_file_path"),
                            telegram_file_id=res.get("telegram_file_id"),
                            telegram_message_id=res.get("telegram_message_id"),
                            file_size_bytes=res.get("file_size")
                        ))
                        lec = save_db.query(Lecture).filter(Lecture.id == lec_id).first()
                        if lec:
                            lec.status = "completed"
                        save_db.commit()
                    existing_types.add("quiz_md")
                    print(f"  ✓ [Lec {lec_id}] تم تنزيل ورفع الكويز بنجاح!")
                    dest.unlink(missing_ok=True)

            # 4. Study Guide
            elif t_id == "report" and "study_guide_md" not in existing_types:
                dest = temp_dir / f"guide_{lec_id}.md"
                c, _ = await run_cmd_async(["notebooklm", "download", "report", str(dest), "--force", "-n", nb_id])
                if c == 0 and dest.exists():
                    txt = dest.read_text(encoding="utf-8", errors="replace")
                    cap = make_telegram_caption(subject_name, lecture_num, title, doctor, "📄 ملخص ودليل دراسي شامل وتأسيسي")
                    res = await telegram_storage.upload_asset(dest, "study_guide_md", cap)
                    with SessionLocal() as save_db:
                        save_db.add(MediaAsset(
                            lecture_id=lec_id, asset_type="study_guide_md", title="دليل دراسي وملخص",
                            content_text=txt,
                            local_file_path=res.get("local_file_path"),
                            telegram_file_id=res.get("telegram_file_id"),
                            telegram_message_id=res.get("telegram_message_id"),
                            file_size_bytes=res.get("file_size")
                        ))
                        lec = save_db.query(Lecture).filter(Lecture.id == lec_id).first()
                        if lec:
                            lec.status = "completed"
                        save_db.commit()
                    existing_types.add("study_guide_md")
                    print(f"  ✓ [Lec {lec_id}] تم تنزيل ورفع الدليل الدراسي بنجاح!")
                    dest.unlink(missing_ok=True)

            # 5. Flashcards
            elif t_id == "flashcards" and ("flashcards_md" not in existing_types and "flashcards_json" not in existing_types):
                dest = temp_dir / f"cards_{lec_id}.md"
                c, _ = await run_cmd_async(["notebooklm", "download", "flashcards", "--format", "markdown", str(dest), "--force", "-n", nb_id])
                if c == 0 and dest.exists():
                    txt = dest.read_text(encoding="utf-8", errors="replace")
                    cap = make_telegram_caption(subject_name, lecture_num, title, doctor, "🃏 بطاقات استذكار ذكية (Flashcards)")
                    res = await telegram_storage.upload_asset(dest, "flashcards_md", cap)
                    with SessionLocal() as save_db:
                        save_db.add(MediaAsset(
                            lecture_id=lec_id, asset_type="flashcards_md", title="بطاقات تعليمية",
                            content_text=txt,
                            local_file_path=res.get("local_file_path"),
                            telegram_file_id=res.get("telegram_file_id"),
                            telegram_message_id=res.get("telegram_message_id"),
                            file_size_bytes=res.get("file_size")
                        ))
                        lec = save_db.query(Lecture).filter(Lecture.id == lec_id).first()
                        if lec:
                            lec.status = "completed"
                        save_db.commit()
                    existing_types.add("flashcards_md")
                    print(f"  ✓ [Lec {lec_id}] تم تنزيل ورفع بطاقات الاستذكار بنجاح!")
                    dest.unlink(missing_ok=True)

async def main():
    parser = argparse.ArgumentParser(description="Reconcile and standardize lecture resources to 5 modalities.")
    parser.add_argument("--audit", action="store_true", help="Print audit of all 21 lectures.")
    parser.add_argument("--retry-failed", action="store_true", help="Retry all failed artifacts across notebooks.")
    parser.add_argument("--trigger-missing", action="store_true", help="Trigger generation for missing modalities.")
    parser.add_argument("--sync", action="store_true", help="Sync completed artifacts to Supabase and Telegram.")
    parser.add_argument("--auto", action="store_true", help="Run full cycle: sync, retry failed, trigger missing.")
    args = parser.parse_args()

    if args.audit:
        audit_all()
    elif args.retry_failed:
        await retry_all_failed()
    elif args.trigger_missing:
        await trigger_missing_generation()
    elif args.sync:
        await sync_completed_assets()
    elif args.auto:
        print("=== Step 1: Syncing completed assets ===")
        await sync_completed_assets()
        print("\n=== Step 2: Retrying failed artifacts ===")
        await retry_all_failed()
        print("\n=== Step 3: Triggering missing generations ===")
        await trigger_missing_generation()
        print("\n=== Step 4: Final Audit ===")
        audit_all()
    else:
        audit_all()

if __name__ == "__main__":
    asyncio.run(main())
