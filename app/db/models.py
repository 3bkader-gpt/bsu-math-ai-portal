"""Database Models for Academic Content Pipeline."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    folder_path = Column(String(500), nullable=False)
    prompt_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    lectures = relationship("Lecture", back_populates="subject", cascade="all, delete-orphan")

class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    lecture_num = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    doctor = Column(String(100), nullable=True)  # Optional doctor / professor track
    status = Column(String(50), default="queued")  # queued, processing, completed, failed
    stage_info = Column(String(200), default="في الانتظار")
    notebook_id = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    subject = relationship("Subject", back_populates="lectures")
    assets = relationship("MediaAsset", back_populates="lecture", cascade="all, delete-orphan")

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)
    asset_type = Column(String(50), nullable=False)  # audio, video, quiz_md, study_guide_md, flashcards_md, mind_map_json, pdf
    title = Column(String(200), nullable=False)
    local_file_path = Column(String(500), nullable=True)
    telegram_file_id = Column(String(200), nullable=True)
    telegram_message_id = Column(Integer, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    lecture = relationship("Lecture", back_populates="assets")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default="admin")
    created_at = Column(DateTime, default=utc_now)
