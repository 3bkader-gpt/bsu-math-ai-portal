import asyncio
from pathlib import Path
from app.config import settings
from app.db.database import SessionLocal
from app.db.models import Lecture, MediaAsset, Subject
from app.services.telegram_storage import telegram_storage
from app.services.notebooklm_service import make_telegram_caption

college_dir = settings.COLLEGE_DIR
subjects_dir = college_dir / "subjects"

async def sync_all_pdfs():
    db = SessionLocal()
    lectures = db.query(Lecture).all()
    print(f"Total lectures to check: {len(lectures)}")
    
    total_added = 0

    for l in lectures:
        sub = db.query(Subject).filter(Subject.id == l.subject_id).first()
        sub_name = sub.name if sub else ""
        
        # Look for lecture folder
        candidates = []
        if (subjects_dir / sub_name / f"lec{l.lecture_num}").exists():
            candidates.append(subjects_dir / sub_name / f"lec{l.lecture_num}")
        else:
            candidates = list((subjects_dir / sub_name).glob(f"**/lec{l.lecture_num}"))
            
        if not candidates:
            print(f"⚠️ [Lec {l.id}] Folder not found for {sub_name} lec {l.lecture_num}")
            continue
            
        lec_folder = candidates[0]
        disk_pdfs = list(lec_folder.glob("*.pdf"))
        
        # Existing DB pdfs
        existing_assets = db.query(MediaAsset).filter(
            MediaAsset.lecture_id == l.id,
            MediaAsset.asset_type.in_(["original_pdf", "pdf"])
        ).all()
        existing_filenames = {Path(a.local_file_path).name if a.local_file_path else a.title for a in existing_assets}
        
        for pdf_path in disk_pdfs:
            if pdf_path.name in existing_filenames:
                continue
                
            print(f"➕ [Lec {l.id} - {sub_name}] Uploading & adding missing PDF: {pdf_path.name}...")
            is_book = "كتاب" in pdf_path.name
            role_desc = "📚 جزء المحاضرة من الكتاب المقرر" if is_book else "✍️ كشكول المحاضرة بخط اليد"
            cap = make_telegram_caption(sub_name, l.lecture_num, l.title, l.doctor, role_desc, pdf_path.name)
            
            try:
                res = await telegram_storage.upload_asset(pdf_path, "pdf", cap)
                new_asset = MediaAsset(
                    lecture_id=l.id,
                    asset_type="original_pdf",
                    title=pdf_path.name,
                    local_file_path=res.get("local_file_path") or str(pdf_path),
                    telegram_file_id=res.get("telegram_file_id"),
                    telegram_message_id=res.get("telegram_message_id"),
                    file_size_bytes=res.get("file_size") or pdf_path.stat().st_size
                )
                db.add(new_asset)
                db.commit()
                total_added += 1
                print(f"   ✓ Added asset id={new_asset.id} (tg_msg={new_asset.telegram_message_id})")
            except Exception as e:
                db.rollback()
                print(f"   ❌ Failed to add {pdf_path.name}: {e}")
                
    print(f"\n==========================================")
    print(f"✅ Sync completed! Total new PDFs added: {total_added}")
    print(f"==========================================")

if __name__ == "__main__":
    asyncio.run(sync_all_pdfs())
