import sys
import os
sys.path.insert(0, os.path.abspath("."))
from sqlalchemy import event
from sqlalchemy.orm import joinedload, selectinload
from app.db.database import SessionLocal, engine
from app.db.models import Lecture, Subject, MediaAsset

sys.stdout.reconfigure(encoding='utf-8')

# Measure Query Count on Unoptimized Loop
query_count_unopt = 0
def count_queries_unopt(conn, cursor, statement, parameters, context, executemany):
    global query_count_unopt
    query_count_unopt += 1

listener_unopt = event.listen(engine, "before_cursor_execute", count_queries_unopt)

with SessionLocal() as db:
    lectures = db.query(Lecture).join(Subject).order_by(Subject.name, Lecture.lecture_num).all()
    for lec in lectures:
        assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == lec.id).all()
        s_name = lec.subject.name if lec.subject else "None"

event.remove(engine, "before_cursor_execute", count_queries_unopt)
print(f"📊 Unoptimized Query Count for {len(lectures)} lectures: {query_count_unopt} queries")

# Measure Query Count on Optimized Loop
query_count_opt = 0
def count_queries_opt(conn, cursor, statement, parameters, context, executemany):
    global query_count_opt
    query_count_opt += 1

event.listen(engine, "before_cursor_execute", count_queries_opt)

with SessionLocal() as db:
    lectures_opt = (
        db.query(Lecture)
        .join(Subject)
        .options(
            joinedload(Lecture.subject),
            selectinload(Lecture.assets)
        )
        .order_by(Subject.name, Lecture.lecture_num)
        .all()
    )
    for lec in lectures_opt:
        assets = lec.assets
        s_name = lec.subject.name if lec.subject else "None"

event.remove(engine, "before_cursor_execute", count_queries_opt)
print(f"⚡ Optimized Query Count for {len(lectures_opt)} lectures: {query_count_opt} queries")

reduction = round((query_count_unopt - query_count_opt) / query_count_unopt * 100, 1)
print(f"🎉 Query Reduction: {reduction}% fewer round-trips! ({query_count_unopt} -> {query_count_opt})")
