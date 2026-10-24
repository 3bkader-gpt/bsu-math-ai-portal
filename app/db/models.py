"""Database Models for Academic Content Pipeline."""
from datetime import datetime, timezone
from typing import Optional, List, ClassVar
from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    folder_path: Mapped[str] = mapped_column(String(500), nullable=False)
    prompt_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    semester: Mapped[int] = mapped_column(default=1, server_default="1", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    lectures: Mapped[List["Lecture"]] = relationship("Lecture", back_populates="subject", cascade="all, delete-orphan")

class Lecture(Base):
    __tablename__ = "lectures"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    lecture_num: Mapped[int] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    doctor: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Optional doctor / professor track
    status: Mapped[str] = mapped_column(String(50), default="queued")  # queued, processing, completed, failed
    stage_info: Mapped[str] = mapped_column(String(200), default="في الانتظار")
    notebook_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # public Storage URL of the uploaded source PDF (split-plane pipeline)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    subject: Mapped["Subject"] = relationship("Subject", back_populates="lectures")
    assets: Mapped[List["MediaAsset"]] = relationship("MediaAsset", back_populates="lecture", cascade="all, delete-orphan")

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lecture_id: Mapped[int] = mapped_column(ForeignKey("lectures.id"), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)  # audio, video, quiz_md, study_guide_md, flashcards_md, mind_map_json, pdf
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    local_file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    telegram_file_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    telegram_message_id: Mapped[Optional[int]] = mapped_column(nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(nullable=True)
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    lecture: Mapped["Lecture"] = relationship("Lecture", back_populates="assets")

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="admin")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
