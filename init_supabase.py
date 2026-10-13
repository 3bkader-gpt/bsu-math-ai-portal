import sys
sys.stdout.reconfigure(encoding='utf-8')

from app.db.database import engine, Base, SessionLocal
from app.db.models import Subject, Lecture, MediaAsset, User
from app.services.prompt_service import sync_subjects_from_filesystem
from app.services.auth_service import init_admin_user

print("1. Creating all database tables in Supabase PostgreSQL...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully in Supabase!")

with SessionLocal() as db:
    print("2. Syncing 11 subjects from filesystem...")
    synced = sync_subjects_from_filesystem(db)
    print(f"Synced {len(synced)} subjects:")
    for s in synced:
        print(f" - ID: {s.id} | Name: {s.name}")

    print("3. Initializing admin user...")
    admin = init_admin_user(db)
    print(f"Admin initialized: {admin.username}")

print("Done! All Supabase migrations & initial data populated successfully.")
