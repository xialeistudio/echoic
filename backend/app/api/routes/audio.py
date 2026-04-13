import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.audio_file import AudioFile
from app.models.practice_record import PracticeRecord
from app.config import settings
from app.schemas.audio import AudioFileCreate, AudioFileResponse, WordPhoneme
from app.services.asr.base import ASRService
from app.services.factory import get_asr_service, get_llm_service, get_scoring_service, get_storage_service
from app.services.llm.base import LLMService
from app.services.scoring.base import ScoringService
from app.services.storage.base import StorageService

router = APIRouter()


async def _download_url(url: str) -> bytes:
    async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            return await response.aread()


def _audio_key(filename: str, *, compressed: bool = False) -> str:
    suffix = ".mp3" if compressed else Path(filename).suffix
    return f"audio/{uuid4().hex}{suffix}"


def _compress_audio(storage: "StorageService", key: str) -> str:
    """Re-encode stored file as 64 kbps mono MP3. Returns new key."""
    src = storage.get_absolute_path(key)
    new_key = Path(key).with_suffix(".mp3").as_posix()
    dst = storage.get_absolute_path(new_key)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-ac", "1", "-ab", "64k", str(dst)],
        check=True,
        capture_output=True,
    )
    if new_key != key:
        try:
            storage.delete(key)
        except Exception:
            pass
    return new_key


def _persist_audio_file(
    db: Session,
    *,
    title: str,
    source_type: str,
    key: str,
    sentences,
    language: str = "en",
) -> AudioFile:
    audio_file = AudioFile(
        title=title,
        source_type=source_type,
        language=language,
        storage_backend=settings.storage.backend,
        file_path=key,
        sentences=[sentence.model_dump() for sentence in sentences],
    )
    db.add(audio_file)
    db.flush()
    db.refresh(audio_file)
    return audio_file


@router.post("/upload", response_model=AudioFileResponse)
async def upload_audio(
    file: UploadFile = File(...),
    compress: bool = Query(False),
    db: Session = Depends(get_db),
    asr: ASRService = Depends(get_asr_service),
    storage: StorageService = Depends(get_storage_service),
):
    key = _audio_key(file.filename or "upload.bin")
    storage.save(await file.read(), key)
    sentences = asr.transcribe(storage.get_absolute_path(key))
    if compress:
        key = _compress_audio(storage, key)
    title = Path(file.filename or "upload").stem or "upload"
    return _persist_audio_file(
        db,
        title=title,
        source_type="upload",
        key=key,
        sentences=sentences,
        language=settings.asr.whisperx.language,
    )


@router.post("/from-url", response_model=AudioFileResponse)
async def import_from_url(
    payload: AudioFileCreate,
    compress: bool = Query(False),
    db: Session = Depends(get_db),
    asr: ASRService = Depends(get_asr_service),
    storage: StorageService = Depends(get_storage_service),
):
    if not payload.url:
        raise HTTPException(status_code=400, detail="url is required")

    filename = Path(urlparse(payload.url).path).name or "imported.bin"
    key = _audio_key(filename)
    storage.save(await _download_url(payload.url), key)
    sentences = asr.transcribe(storage.get_absolute_path(key))
    if compress:
        key = _compress_audio(storage, key)
    return _persist_audio_file(
        db,
        title=payload.title,
        source_type="url",
        key=key,
        sentences=sentences,
        language=settings.asr.whisperx.language,
    )


@router.get("/", response_model=list[AudioFileResponse])
async def list_audio_files(db: Session = Depends(get_db)):
    from sqlalchemy import func as sa_func

    rows = (
        db.query(AudioFile, sa_func.count(PracticeRecord.id).label("practice_count"))
        .outerjoin(PracticeRecord, PracticeRecord.audio_file_id == AudioFile.id)
        .group_by(AudioFile.id)
        .order_by(AudioFile.created_at.desc())
        .all()
    )
    result = []
    for audio_file, count in rows:
        data = AudioFileResponse.model_validate(audio_file)
        data.practice_count = count
        result.append(data)
    return result


@router.get("/{audio_file_id}", response_model=AudioFileResponse)
async def get_audio_file(audio_file_id: int, db: Session = Depends(get_db)):
    audio_file = db.get(AudioFile, audio_file_id)
    if audio_file is None:
        raise HTTPException(status_code=404, detail="audio file not found")
    return audio_file


def _get_sentence_dict(audio_file: AudioFile, sentence_index: int) -> dict:
    sentences = audio_file.sentences or []
    if sentence_index < 0 or sentence_index >= len(sentences):
        raise HTTPException(status_code=404, detail="sentence not found")
    return sentences[sentence_index]


def _update_sentence_field(db: Session, audio_file: AudioFile, sentence_index: int, **fields) -> None:
    sentences = [dict(s) for s in (audio_file.sentences or [])]
    sentences[sentence_index].update(fields)
    audio_file.sentences = sentences
    db.commit()


@router.post("/{audio_file_id}/sentence/{sentence_index}/bookmark")
async def toggle_bookmark(
    audio_file_id: int,
    sentence_index: int,
    db: Session = Depends(get_db),
):
    audio_file = db.get(AudioFile, audio_file_id)
    if audio_file is None:
        raise HTTPException(status_code=404, detail="audio file not found")
    sentence = _get_sentence_dict(audio_file, sentence_index)
    new_val = not sentence.get("bookmarked", False)
    _update_sentence_field(db, audio_file, sentence_index, bookmarked=new_val)
    return {"bookmarked": new_val}


@router.get("/{audio_file_id}/sentence/{sentence_index}/phonemes", response_model=list[WordPhoneme])
async def get_sentence_phonemes(
    audio_file_id: int,
    sentence_index: int,
    db: Session = Depends(get_db),
    scoring: ScoringService = Depends(get_scoring_service),
):
    audio_file = db.get(AudioFile, audio_file_id)
    if audio_file is None:
        raise HTTPException(status_code=404, detail="audio file not found")
    sentence = _get_sentence_dict(audio_file, sentence_index)
    if cached := sentence.get("word_phonemes"):
        return [WordPhoneme(**p) for p in cached]
    words = [w["word"] for w in (sentence.get("words") or []) if w.get("word")]
    if not words:
        words = str(sentence.get("text", "")).split()
    ipa_list = scoring.phonemize_words(words)
    result = [WordPhoneme(word=w, ipa=p) for w, p in zip(words, ipa_list)]
    _update_sentence_field(db, audio_file, sentence_index, word_phonemes=[r.model_dump() for r in result])
    return result


@router.post("/{audio_file_id}/sentence/{sentence_index}/analyze")
async def analyze_sentence(
    audio_file_id: int,
    sentence_index: int,
    lang: str = Query("zh-CN"),
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
):
    audio_file = db.get(AudioFile, audio_file_id)
    if audio_file is None:
        raise HTTPException(status_code=404, detail="audio file not found")
    sentence = _get_sentence_dict(audio_file, sentence_index)
    if sentence.get("analysis"):
        return {"analysis": sentence["analysis"]}
    if settings.llm.backend == "openai" and not settings.llm.openai.api_key:
        raise HTTPException(status_code=503, detail="LLM not configured")
    analysis = llm.analyze(str(sentence.get("text", "")), reply_lang=lang)
    _update_sentence_field(db, audio_file, sentence_index, analysis=analysis)
    return {"analysis": analysis}


@router.get("/{audio_file_id}/stream")
async def stream_audio_file(audio_file_id: int, db: Session = Depends(get_db)):
    audio_file = db.get(AudioFile, audio_file_id)
    if audio_file is None:
        raise HTTPException(status_code=404, detail="audio file not found")
    storage = get_storage_service(audio_file.storage_backend)
    path = storage.get_absolute_path(audio_file.file_path)
    return FileResponse(path)


class AudioFileUpdate(BaseModel):
    title: str | None = None
    language: str | None = None


@router.patch("/{audio_file_id}", response_model=AudioFileResponse)
async def update_audio_file(
    audio_file_id: int,
    payload: AudioFileUpdate,
    db: Session = Depends(get_db),
):
    audio_file = db.get(AudioFile, audio_file_id)
    if audio_file is None:
        raise HTTPException(status_code=404, detail="audio file not found")
    if payload.title is not None:
        audio_file.title = payload.title
    if payload.language is not None:
        audio_file.language = payload.language
    db.commit()
    db.refresh(audio_file)
    return audio_file


@router.delete("/{audio_file_id}", status_code=204)
async def delete_audio_file(
    audio_file_id: int,
    db: Session = Depends(get_db),
):
    audio_file = db.get(AudioFile, audio_file_id)
    if audio_file is None:
        raise HTTPException(status_code=404, detail="audio file not found")
    storage = get_storage_service(audio_file.storage_backend)
    try:
        storage.delete(audio_file.file_path)
    except Exception:
        pass
    db.query(PracticeRecord).filter(PracticeRecord.audio_file_id == audio_file_id).delete()
    db.delete(audio_file)
    db.commit()


