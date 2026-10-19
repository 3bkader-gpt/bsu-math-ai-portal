import sys
import os
import psycopg2
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")

def inspect_db():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = [r[0] for r in cur.fetchall()]
    print("Tables in public schema:")
    for t in tables:
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (t,))
        cols = cur.fetchall()
        print(f"  • {t}: {[c[0] for c in cols]}")
        
    # Check functions
    cur.execute("""
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        ORDER BY routine_name;
    """)
    routines = [r[0] for r in cur.fetchall()]
    print("\nFunctions in public schema:")
    for r in routines:
        print(f"  • {r}()")
        
    conn.close()

if __name__ == "__main__":
    inspect_db()
