from contextlib import contextmanager
from datetime import datetime, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.models.audio_file import AudioFile
from app.schemas.audio import Sentence, WordTimestamp
from app.services.factory import get_asr_service, get_storage_service


class MockStorageService:
    def __init__(self):
        self.saved = []

    def save(self, data: bytes, key: str) -> str:
        self.saved.append((key, data))
        return key

    def load(self, key: str) -> bytes:
        return b""

    def delete(self, key: str) -> None:
        return None

    def get_absolute_path(self, key: str) -> str:
        return f"/tmp/{key}"


class MockASRService:
    def __init__(self):
        self.paths = []

    def transcribe(self, audio_path: str) -> list[Sentence]:
        self.paths.append(audio_path)
        return [
            Sentence(
                index=0,
                text="hello world",
                start=0.0,
                end=1.0,
                words=[WordTimestamp(word="hello", start=0.0, end=0.4)],
            )
        ]


@contextmanager
def _client(db, storage, asr):
    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_storage_service] = lambda: storage
    app.dependency_overrides[get_asr_service] = lambda: asr
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_upload_audio_persists_record_and_transcription(db):
    storage = MockStorageService()
    asr = MockASRService()

    with _client(db, storage, asr) as client:
        response = client.post(
            "/api/audio/upload",
            files={"file": ("lesson.mp3", b"audio-bytes", "audio/mpeg")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "lesson"
    assert body["sentences"][0]["text"] == "hello world"
    assert storage.saved[0][1] == b"audio-bytes"
    assert asr.paths == [f"/tmp/{storage.saved[0][0]}"]

    saved = db.get(AudioFile, body["id"])
    assert saved.source_type == "upload"
    assert saved.title == "lesson"
    assert saved.sentences[0]["words"][0]["word"] == "hello"


def test_import_from_url_downloads_transcribes_and_persists(db, monkeypatch):
    storage = MockStorageService()
    asr = MockASRService()

    async def fake_download(url: str) -> bytes:
        return b"downloaded-audio"

    monkeypatch.setattr("app.api.routes.audio._download_url", fake_download)

    with _client(db, storage, asr) as client:
        response = client.post(
            "/api/audio/from-url",
            json={
                "title": "Remote lesson",
                "source_type": "url",
                "url": "https://example.com/audio/sample.mp3",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Remote lesson"
    assert storage.saved[0][1] == b"downloaded-audio"
    assert asr.paths == [f"/tmp/{storage.saved[0][0]}"]

    saved = db.get(AudioFile, body["id"])
    assert saved.source_type == "url"
    assert saved.title == "Remote lesson"


def test_import_from_url_requires_url(db):
    storage = MockStorageService()
    asr = MockASRService()

    with _client(db, storage, asr) as client:
        response = client.post(
            "/api/audio/from-url",
            json={"title": "Missing URL", "source_type": "url", "url": None},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "url is required"


def test_list_audio_files_returns_most_recent_first(db):
    older = AudioFile(
        title="Older",
        source_type="upload",
        storage_backend="local",
        file_path="audio/older.mp3",
        sentences=[],
        created_at=datetime.utcnow(),
    )
    newer = AudioFile(
        title="Newer",
        source_type="url",
        storage_backend="local",
        file_path="audio/newer.mp3",
        sentences=[],
        created_at=datetime.utcnow() + timedelta(seconds=10),
    )
    db.add_all([older, newer])
    db.flush()

    with _client(db, MockStorageService(), MockASRService()) as client:
        response = client.get("/api/audio/")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Newer", "Older"]


def test_get_audio_file_returns_record_and_404_for_missing(db):
    audio_file = AudioFile(
        title="Single",
        source_type="upload",
        storage_backend="local",
        file_path="audio/single.mp3",
        sentences=[{"index": 0, "text": "single", "start": 0.0, "end": 1.0, "words": []}],
    )
    db.add(audio_file)
    db.flush()

    with _client(db, MockStorageService(), MockASRService()) as client:
        ok_response = client.get(f"/api/audio/{audio_file.id}")
        missing_response = client.get("/api/audio/9999")

    assert ok_response.status_code == 200
    assert ok_response.json()["title"] == "Single"
    assert missing_response.status_code == 404
    assert missing_response.json()["detail"] == "audio file not found"
