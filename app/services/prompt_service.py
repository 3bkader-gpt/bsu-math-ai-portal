import os
from pathlib import Path
from sqlalchemy.orm import Session
from app.config import settings
from app.db.models import Subject

def sync_subjects_from_filesystem(db: Session):
    r"""
    Scans D:\الكليه\subjects as well as D:\الكليه (for active subjects like تعليم ورياده اعمال),
    and registers all academic subject folders into the database.
    """
    college_dir = settings.COLLEGE_DIR
    subjects_container = college_dir / "subjects"
    
    candidate_folders = []
    
    # 1. Scan inside subjects container if it exists
    if subjects_container.exists():
        for item in subjects_container.iterdir():
            if item.is_dir() and not item.name.startswith("."):
                candidate_folders.append(item)
                
    # 2. Also check subject folders directly in college_dir
    ignored = {"BOT", "subjects", "bsu-math-portal", "مروه", "وليد", "venv", ".git", "__pycache__", "node_modules", "dist", "build"}
    if college_dir.exists():
        for item in college_dir.iterdir():
            if item.is_dir() and item.name not in ignored and not item.name.startswith("."):
                # Avoid duplicates if already found in subjects container
                if not any(f.name == item.name for f in candidate_folders):
                    candidate_folders.append(item)

    # Clean stray non-subject folders from DB
    db.query(Subject).filter(Subject.name.in_(list(ignored))).delete(synchronize_session=False)
    db.query(Subject).filter(Subject.name.like(".%")).delete(synchronize_session=False)

    synced = []
    for item in candidate_folders:
        prompt_file = item / "prompt.txt"
        prompt_path_str = str(prompt_file) if prompt_file.exists() else None

        subject = db.query(Subject).filter(Subject.name == item.name).first()
        if not subject:
            subject = Subject(
                name=item.name,
                folder_path=str(item),
                prompt_path=prompt_path_str
            )
            db.add(subject)
        else:
            subject.folder_path = str(item)
            subject.prompt_path = prompt_path_str

        synced.append(subject)

    db.commit()
    return synced

def get_subject_prompt(subject_name: str) -> str | None:
    """Returns the absolute path to prompt.txt for the given subject."""
    # Check subjects container first, then direct college dir
    for base in [settings.COLLEGE_DIR / "subjects", settings.COLLEGE_DIR]:
        candidate = base / subject_name / "prompt.txt"
        if candidate.exists():
            return str(candidate)
    return None
