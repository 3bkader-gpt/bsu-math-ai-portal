import sys
from pathlib import Path
from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset

sys.stdout.reconfigure(encoding='utf-8')

db = SessionLocal()
subject = db.query(Subject).filter(Subject.name == 'تعليم ورياده اعمال').first()
print('Subject found:', subject.name if subject else 'None')

if subject:
    for doc_name in ['دكتورة مروة (التربية)', 'دكتور وليد (ريادة الأعمال)']:
        doc_folder = Path(subject.folder_path) / doc_name
        if doc_folder.exists():
            for lec_dir in doc_folder.iterdir():
                if lec_dir.is_dir() and lec_dir.name.startswith('lec'):
                    try:
                        num = int(lec_dir.name.replace('lec', ''))
                    except ValueError:
                        continue
                    existing = db.query(Lecture).filter(
                        Lecture.subject_id == subject.id,
                        Lecture.lecture_num == num,
                        Lecture.doctor == doc_name
                    ).first()
                    if not existing:
                        lec = Lecture(
                            subject_id=subject.id,
                            lecture_num=num,
                            title=f'المحاضرة {num}: {doc_name}',
                            doctor=doc_name,
                            status='queued',
                            stage_info='جاهزة للمعالجة والتوليد'
                        )
                        db.add(lec)
                        print(f'Added Lecture {num} for {doc_name}')
                    else:
                        print(f'Lecture {num} already exists for {doc_name}')
    db.commit()

db.close()
