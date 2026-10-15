import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from app.db.database import SessionLocal
from app.db.models import Lecture, MediaAsset

with SessionLocal() as db:
    for l in db.query(Lecture).order_by(Lecture.id).all():
        assets = db.query(MediaAsset).filter(MediaAsset.lecture_id == l.id).all()
        quiz = next((a for a in assets if a.asset_type == 'quiz_md'), None)
        guide = next((a for a in assets if a.asset_type == 'study_guide_md'), None)
        cards = next((a for a in assets if a.asset_type in ('flashcards_md', 'flashcards_json')), None)
        audio = next((a for a in assets if a.asset_type == 'audio'), None)
        video = next((a for a in assets if a.asset_type == 'video'), None)
        
        q_text = len(quiz.content_text or '') if quiz else 0
        g_text = len(guide.content_text or '') if guide else 0
        c_text = len(cards.content_text or '') if cards else 0
        
        a_tg = audio.telegram_message_id if audio else None
        v_tg = video.telegram_message_id if video else None
        
        print(f"Lec #{l.id} [{l.title[:30]}] -> QuizText: {q_text} chars | GuideText: {g_text} chars | AudioMsg: {a_tg} | VideoMsg: {v_tg}")
