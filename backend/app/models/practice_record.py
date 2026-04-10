from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base


class PracticeRecord(Base):
    __tablename__ = "practice_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # reserved
    audio_file_id: Mapped[int] = mapped_column(Integer, ForeignKey("audio_files.id"))
    sentence_index: Mapped[int] = mapped_column(Integer)
    sentence_text: Mapped[str] = mapped_column(String)
    storage_backend: Mapped[str] = mapped_column(String, default="local")  # local | s3
    # Storage key relative to backend root, e.g. "recordings/abc123.webm"
    recording_path: Mapped[str] = mapped_column(String)
    # Scores
    accuracy_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    fluency_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    completeness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Word-level details for highlight feedback
    word_scores: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
