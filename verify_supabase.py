import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.db.database import SessionLocal
from app.db.models import Subject, Lecture, MediaAsset, User

with SessionLocal() as db:
    users = db.query(User).all()
    print('Users in Supabase:', len(users), [u.username for u in users])
    subjects = db.query(Subject).all()
    print('Subjects in Supabase:', len(subjects))
    lectures = db.query(Lecture).all()
    print('Lectures in Supabase:', len(lectures), [(l.id, l.title, l.status) for l in lectures])
    assets = db.query(MediaAsset).all()
    print(f'Media Assets in Supabase ({len(assets)}):')
    for a in assets:
        print(f" - [{a.asset_type}] {a.title} ({a.file_size_bytes} bytes)")
