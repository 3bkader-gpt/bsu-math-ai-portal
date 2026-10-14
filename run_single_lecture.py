import sys
import asyncio
from pathlib import Path

import logging

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

from app.db.database import SessionLocal
from app.db.models import Subject, Lecture
from app.services.notebooklm_service import NotebookLMPipeline

async def main():
    subject_name = "فلسفه وتاريخ رياضيات"
    lecture_num = 1
    title = "فلسفة الرياضيات وبنيتها"
    
    pdf_paths = [
        Path(r"D:\الكليه\subjects\فلسفه وتاريخ رياضيات\lec1\lec1.pdf"),
        Path(r"D:\الكليه\subjects\فلسفه وتاريخ رياضيات\lec1\كتاب - فلسفة الرياضيات وبنيتها.pdf")
    ]
    prompt_path = r"D:\الكليه\subjects\فلسفه وتاريخ رياضيات\prompt.txt"

    db = SessionLocal()
    try:
        subject = db.query(Subject).filter(Subject.name == subject_name).first()
        if not subject:
            print(f"Error: Subject '{subject_name}' not found!")
            return

        # Check existing
        lecture = db.query(Lecture).filter(
            Lecture.subject_id == subject.id,
            Lecture.lecture_num == lecture_num
        ).first()

        if not lecture:
            lecture = Lecture(
                subject_id=subject.id,
                lecture_num=lecture_num,
                title=title,
                doctor=None,
                status="queued",
                stage_info="جاري بدء المعالجة..."
            )
            db.add(lecture)
            db.commit()
            db.refresh(lecture)
            print(f"Created lecture ID {lecture.id} for {subject_name} - Lec {lecture_num}")
        else:
            lecture.title = title
            lecture.status = "queued"
            lecture.stage_info = "جاري إعادة المعالجة..."
            db.commit()
            print(f"Re-using existing lecture ID {lecture.id}")

        print(f"Starting pipeline for Lecture ID: {lecture.id} ...")
        await NotebookLMPipeline.process_lecture_pipeline(
            lecture_id=lecture.id,
            subject_name=subject_name,
            lecture_num=lecture_num,
            pdf_paths=pdf_paths,
            prompt_path=prompt_path,
            db_factory=SessionLocal,
            doctor=None
        )
        print("Pipeline finished successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
