from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base


class OralAttempt(Base):
    __tablename__ = "oral_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_type: Mapped[str] = mapped_column(String)
    question_language: Mapped[str] = mapped_column(String)
    question_difficulty: Mapped[str | None] = mapped_column(String, nullable=True)
    question_prompt: Mapped[str] = mapped_column(String)
    question_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    storage_backend: Mapped[str] = mapped_column(String, default="local")
    recording_path: Mapped[str] = mapped_column(String)
    # Pronunciation scores (all types)
    accuracy_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    fluency_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    completeness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    word_scores: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Free-form extras
    transcription: Mapped[str | None] = mapped_column(String, nullable=True)
    llm_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    llm_feedback: Mapped[str | None] = mapped_column(String, nullable=True)
    llm_highlights: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # User settings snapshot
    timer_secs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
