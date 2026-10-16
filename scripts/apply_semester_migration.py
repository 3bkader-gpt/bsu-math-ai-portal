import sys
import requests
from sqlalchemy import text
from app.db.database import engine, SessionLocal
from app.db.models import Subject, Lecture, MediaAsset

sys.stdout.reconfigure(encoding='utf-8')

print("==================================================")
print("🚀 Applying Phase 3 Step 2 Migration to Supabase...")
print("==================================================")

# 1. Audit State Before Migration
with SessionLocal() as db:
    sub_count_before = db.query(Subject).count()
    lec_count_before = db.query(Lecture).count()
    asset_count_before = db.query(MediaAsset).count()
    print(f"📊 State BEFORE Migration:")
    print(f"   - Subjects: {sub_count_before}")
    print(f"   - Lectures: {lec_count_before}")
    print(f"   - Media Assets: {asset_count_before}")

# 2. Read and Execute Migration SQL
with open("supabase/migrations/20261016_add_semester_to_subjects.sql", "r", encoding="utf-8") as f:
    sql_script = f.read()

print("\n⚡ Executing SQL Migration statements...")
with engine.begin() as conn:
    # Split by statements or execute via raw connection
    raw_conn = conn.connection
    with raw_conn.cursor() as cursor:
        cursor.execute(sql_script)
print("✅ SQL Migration applied successfully!")

# 3. Audit State After Migration
with SessionLocal() as db:
    sub_count_after = db.query(Subject).count()
    lec_count_after = db.query(Lecture).count()
    asset_count_after = db.query(MediaAsset).count()

    print(f"\n📊 State AFTER Migration:")
    print(f"   - Subjects: {sub_count_after} (Expected: {sub_count_before})")
    print(f"   - Lectures: {lec_count_after} (Expected: {lec_count_before})")
    print(f"   - Media Assets: {asset_count_after} (Expected: {asset_count_before})")

    assert sub_count_before == sub_count_after, "Subject count mismatch!"
    assert lec_count_before == lec_count_after, "Lecture count mismatch!"
    assert asset_count_before == asset_count_after, "Asset count mismatch!"

    # Verify column value using raw text SQL
    rows = db.execute(text("SELECT id, name, semester FROM subjects ORDER BY id ASC")).fetchall()
    print(f"\n📋 Verified Subjects & Semester Assignment in DB:")
    for r in rows:
        print(f"   - ID: {r[0]} | Name: {r[1]} | Semester: {r[2]}")
        assert r[2] == 1, f"Subject {r[1]} should be Semester 1, found: {r[2]}"

# 4. Probe Supabase PostgREST Edge API
print("\n🌐 Probing live Supabase PostgREST Edge API...")
from app.config import settings
url = f"{settings.SUPABASE_URL}/rest/v1/subjects?select=id,name,semester&order=id.asc&limit=3"
headers = {
    "apikey": settings.SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
    "Accept": "application/json"
}

resp = requests.get(url, headers=headers)
print(f"   HTTP Status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    print("   PostgREST Response sample:", data)
    assert len(data) > 0, "No data returned by PostgREST!"
    assert "semester" in data[0], "semester field missing in PostgREST response!"
    print("🎉 Live Supabase PostgREST schema verification PASSED 100%!")
else:
    print(f"❌ PostgREST probe failed: {resp.status_code} {resp.text}")
    sys.exit(1)

print("\n==================================================")
print("✅ ALL MIGRATION AND INTEGRITY CHECKS COMPLETED!")
print("==================================================")
