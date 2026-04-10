from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.audio_file import AudioFile
from app.models.practice_record import PracticeRecord
from app.schemas.practice import PracticeRecordResponse
from app.services.alignment.base import AlignmentService
from app.services.factory import get_alignment_service, get_scoring_service, get_storage_service
from app.services.scoring.base import ScoringService
from app.services.storage.base import StorageService

router = APIRouter()


def _recording_key(filename: str) -> str:
    suffix = Path(filename).suffix
    return f"recordings/{uuid4().hex}{suffix}"


def _sentence_text(audio_file: AudioFile, sentence_index: int) -> str:
    sentences = audio_file.sentences or []
    if sentence_index < 0 or sentence_index >= len(sentences):
        raise HTTPException(status_code=404, detail="sentence not found")

    text = str(sentences[sentence_index].get("text", "")).strip()
    if not text:
        raise HTTPException(status_code=404, detail="sentence not found")
    return text


@router.post("/{audio_file_id}/sentence/{sentence_index}/save", response_model=PracticeRecordResponse)
async def save_recording(
    audio_file_id: int,
    sentence_index: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """Save recording without scoring. Returns record with null scores."""
    audio_file = db.get(AudioFile, audio_file_id)
    if audio_file is None:
        raise HTTPException(status_code=404, detail="audio file not found")

    sentence_text = _sentence_text(audio_file, sentence_index)
    key = _recording_key(file.filename or "recording.bin")
    storage.save(await file.read(), key)

    record = PracticeRecord(
        audio_file_id=audio_file.id,
        sentence_index=sentence_index,
        sentence_text=sentence_text,
        storage_backend=settings.storage.backend,
        recording_path=key,
    )
    db.add(record)
    db.flush()
    db.refresh(record)
    return record


@router.post("/record/{record_id}/score", response_model=PracticeRecordResponse)
async def score_recording(
    record_id: int,
    db: Session = Depends(get_db),
    alignment: AlignmentService = Depends(get_alignment_service),
    scoring: ScoringService = Depends(get_scoring_service),
):
    """Run alignment + scoring on a saved record. Updates and returns the record."""
    record = db.get(PracticeRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="record not found")

    storage = get_storage_service(record.storage_backend)
    recording_path = storage.get_absolute_path(record.recording_path)
    aligned_words = alignment.align(recording_path, record.sentence_text)
    result = scoring.score(recording_path, record.sentence_text, aligned_words)

    record.accuracy_score = result.accuracy_score
    record.fluency_score = result.fluency_score
    record.completeness_score = result.completeness_score
    record.word_scores = [ws.model_dump() for ws in result.word_scores]
    db.commit()
    db.refresh(record)
    return record


@router.get("/record/{record_id}/stream")
async def stream_recording(record_id: int, db: Session = Depends(get_db)):
    record = db.get(PracticeRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="record not found")
    storage = get_storage_service(record.storage_backend)
    path = storage.get_absolute_path(record.recording_path)
    return FileResponse(path)


@router.delete("/record/{record_id}", status_code=204)
async def delete_recording(record_id: int, db: Session = Depends(get_db)):
    record = db.get(PracticeRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="record not found")
    storage = get_storage_service(record.storage_backend)
    try:
        storage.delete(record.recording_path)
    except Exception:
        pass
    db.delete(record)
    db.commit()


@router.get("/{audio_file_id}/sentence/{sentence_index}/history", response_model=list[PracticeRecordResponse])
async def get_sentence_history(
    audio_file_id: int,
    sentence_index: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(PracticeRecord)
        .filter(
            PracticeRecord.audio_file_id == audio_file_id,
            PracticeRecord.sentence_index == sentence_index,
        )
        .order_by(PracticeRecord.created_at.desc())
        .all()
    )
