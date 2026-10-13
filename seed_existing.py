from pathlib import Path
from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset

def seed():
    db = SessionLocal()
    subject = db.query(Subject).filter(Subject.name == "هندسه تفاضلية").first()
    if not subject:
        print("Subject not found")
        db.close()
        return

    lec = db.query(Lecture).filter(Lecture.subject_id == subject.id, Lecture.lecture_num == 1).first()
    if not lec:
        lec = Lecture(
            subject_id=subject.id,
            lecture_num=1,
            title="المحاضرة 1: مفهوم المنحنى وطول القوس",
            status="completed",
            stage_info="اكتملت جميع المخرجات بنجاح ✅"
        )
        db.add(lec)
        db.commit()
        db.refresh(lec)

    out_dir = Path(r"D:\الكليه\هندسه تفاضلية\lec1\notebooklm_output")
    assets = [
        ("audio", "بودكاست الشرح الصوتي بالمصري", out_dir / "audio_overview.m4a"),
        ("video", "فيديو الشرح التوضيحي", out_dir / "video_overview.mp4"),
        ("quiz_md", "كويز المحاضرة والأسئلة", out_dir / "quiz.md"),
        ("study_guide_md", "الدليل الدراسي والملخص الشامل", out_dir / "study_guide.md"),
        ("flashcards_md", "بطاقات الاستذكار التعليمية", out_dir / "flashcards.md"),
        ("mind_map_json", "الخريطة الذهنية", out_dir / "mind_map.json")
    ]
    
    # Add assets if not present
    existing_types = {a.asset_type for a in lec.assets}
    for a_type, title, p in assets:
        if a_type not in existing_types and p.exists():
            db.add(MediaAsset(
                lecture_id=lec.id,
                asset_type=a_type,
                title=title,
                local_file_path=str(p),
                file_size_bytes=p.stat().st_size
            ))
    db.commit()
    print(f"Successfully seeded Differential Geometry Lecture 1 with {len(lec.assets)} assets!")
    db.close()

if __name__ == "__main__":
    seed()
