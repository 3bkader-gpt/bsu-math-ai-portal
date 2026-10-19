import sys
import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")

def run_migration():
    migration_file = Path(__file__).parent.parent / "supabase" / "migrations" / "20261019_phase2_gamification_schema.sql"
    sql = migration_file.read_text(encoding="utf-8")
    
    print(f"Applying migration: {migration_file.name} ...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        cur.execute(sql)
        print("SUCCESS: Migration applied successfully!")
    except Exception as e:
        print(f"ERROR: Migration error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
