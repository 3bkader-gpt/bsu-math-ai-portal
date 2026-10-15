import sys
from app.db.database import SessionLocal
from app.db.models import Subject, Lecture

if hasattr(sys.stdout, 'reconfigure'):
    getattr(sys.stdout, 'reconfigure')(encoding='utf-8')

DOCTOR_MAP = {
    "هندسه تفاضلية": "د/ سيد",
    "فلسفه وتاريخ رياضيات": "د/ طه ابراهيم",
    "معادلات تفاضلية": "د/ حسين",
    "ديناميكا 2": "د/ مروة ذكري",
    "نظريه عدد ومنطق": "د/ محمد حسين",
    "استاتيكا2": "د/ ايه",
    "اداره معرفه": "د/ عزام",
    "تكنولوجيا والتحول الرقمي": "د/ ايمان",
    "تدريس مصغر": "د/ عبدالرحمن برعي",
    "كهربيه مغناطيسية وتيار متردد": "د/ حسن سيد",
}

def update_doctors():
    db = SessionLocal()
    try:
        # Update existing lectures
        lectures = db.query(Lecture).all()
        updated_count = 0
        for lec in lectures:
            sub_name = lec.subject.name if lec.subject else ""
            if sub_name == "تعليم ورياده اعمال":
                # keep specific track: د/ مروة or د/ وليد
                if lec.doctor and "وليد" in lec.doctor:
                    lec.doctor = "د/ وليد"
                elif lec.doctor and "مروة" in lec.doctor:
                    lec.doctor = "د/ مروة"
                updated_count += 1
            elif sub_name in DOCTOR_MAP:
                lec.doctor = DOCTOR_MAP[sub_name]
                updated_count += 1
                
        db.commit()
        print(f"Successfully updated {updated_count} lectures in DB with official doctor names!")
        
        print("\nCurrent DB State for Lectures:")
        for l in db.query(Lecture).order_by(Lecture.subject_id, Lecture.lecture_num).all():
            print(f" - [{l.subject.name if l.subject else ''}] Lec {l.lecture_num}: {l.title} -> 👨‍🏫 {l.doctor}")
            
    finally:
        db.close()

if __name__ == "__main__":
    update_doctors()
