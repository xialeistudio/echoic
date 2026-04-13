from datetime import datetime
from sqlalchemy import Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class AudioFile(Base):
    __tablename__ = "audio_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # reserved
    title: Mapped[str] = mapped_column(String)
    source_type: Mapped[str] = mapped_column(String)  # "upload" | "url"
    storage_backend: Mapped[str] = mapped_column(String, default="local")  # local | s3
    language: Mapped[str] = mapped_column(String, default="en")
    collection_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("collections.id", ondelete="SET NULL"), nullable=True)
    # Storage key relative to backend root, e.g. "audio/abc123.mp3"
    file_path: Mapped[str] = mapped_column(String)
    # ASR result: list of {text, start, end, words: [{word, start, end}]}
    sentences: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    collection = relationship("Collection", back_populates="audio_files")
