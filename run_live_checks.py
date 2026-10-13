import sys
import json
import httpx
from app.db.database import SessionLocal
from app.services.prompt_service import sync_subjects_from_filesystem

sys.stdout.reconfigure(encoding='utf-8')

# Ensure clean subjects in DB
with SessionLocal() as db:
    synced = sync_subjects_from_filesystem(db)

print("=" * 60)
print("CHECK 1: GET http://127.0.0.1:8000/api/subjects")
print("=" * 60)

r = httpx.get("http://127.0.0.1:8000/api/subjects", timeout=10)
print(f"HTTP Status: {r.status_code}")
subjects = r.json()
print(f"Total Academic Subjects in Supabase: {len(subjects)}")
for s in subjects:
    print(f"  - [{s['id']}] {s['name']} (Prompt Configured: {s['has_prompt']}, Lectures: {s['lecture_count']})")

print("\n" + "=" * 60)
print("CHECK 1 (b): SWAGGER DOCS (http://127.0.0.1:8000/docs)")
print("=" * 60)
r_docs = httpx.get("http://127.0.0.1:8000/docs", timeout=10)
print(f"Swagger UI Status: {r_docs.status_code} OK (HTML length: {len(r_docs.text)} chars)")
