from contextlib import contextmanager
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.models.audio_file import AudioFile
from app.models.practice_record import PracticeRecord
from app.schemas.audio import WordTimestamp
from app.schemas.practice import WordScore
from app.services.factory import get_alignment_service, get_scoring_service, get_storage_service
from app.services.scoring.base import ScoringResult


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


class MockAlignmentService:
    def __init__(self):
        self.calls = []

    def align(self, audio_path: str, reference_text: str) -> list[WordTimestamp]:
        self.calls.append((audio_path, reference_text))
        return [WordTimestamp(word="hello", start=0.0, end=0.5)]


class MockScoringService:
    def __init__(self):
        self.calls = []

    def score(self, recording_path: str, reference_text: str, aligned_words: list[WordTimestamp]) -> ScoringResult:
        self.calls.append((recording_path, reference_text, aligned_words))
        return ScoringResult(
            accuracy_score=91.0,
            fluency_score=82.0,
            completeness_score=100.0,
            word_scores=[WordScore(word="hello", accuracy_score=91.0, expected_phonemes="hɛloʊ", actual_phonemes="hɛloʊ", phoneme_scores=[90.0])],
        )


@contextmanager
def _client(db, storage, alignment, scoring):
    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_storage_service] = lambda: storage
    app.dependency_overrides[get_alignment_service] = lambda: alignment
    app.dependency_overrides[get_scoring_service] = lambda: scoring
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _seed_audio_file(db) -> AudioFile:
    audio_file = AudioFile(
        title="Lesson",
        source_type="upload",
        storage_backend="local",
        file_path="audio/lesson.mp3",
        sentences=[
            {"index": 0, "text": "hello world", "start": 0.0, "end": 1.0, "words": []},
            {"index": 1, "text": "second sentence", "start": 1.0, "end": 2.0, "words": []},
        ],
    )
    db.add(audio_file)
    db.flush()
    return audio_file


def test_submit_recording_returns_scores_and_persists_record(db):
    audio_file = _seed_audio_file(db)
    storage = MockStorageService()
    alignment = MockAlignmentService()
    scoring = MockScoringService()

    with _client(db, storage, alignment, scoring) as client:
        response = client.post(
            f"/api/practice/{audio_file.id}/sentence/0",
            files={"file": ("attempt.webm", b"recording-bytes", "audio/webm")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["audio_file_id"] == audio_file.id
    assert body["sentence_index"] == 0
    assert body["sentence_text"] == "hello world"
    assert body["accuracy_score"] == 91.0
    assert body["fluency_score"] == 82.0
    assert body["completeness_score"] == 100.0
    assert body["word_scores"][0]["word"] == "hello"

    assert storage.saved[0][1] == b"recording-bytes"
    stored_key = storage.saved[0][0]
    assert alignment.calls == [(f"/tmp/{stored_key}", "hello world")]
    assert scoring.calls[0][0] == f"/tmp/{stored_key}"
    assert scoring.calls[0][1] == "hello world"

    record = db.get(PracticeRecord, body["id"])
    assert record.recording_path == stored_key
    assert record.word_scores == [{"word": "hello", "accuracy_score": 91.0, "expected_phonemes": "hɛloʊ", "actual_phonemes": "hɛloʊ", "phoneme_scores": [90.0]}]


def test_submit_recording_returns_404_for_unknown_audio_file(db):
    with _client(db, MockStorageService(), MockAlignmentService(), MockScoringService()) as client:
        response = client.post(
            "/api/practice/9999/sentence/0",
            files={"file": ("attempt.webm", b"recording-bytes", "audio/webm")},
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "audio file not found"


def test_history_returns_records_in_reverse_chronological_order(db):
    audio_file = _seed_audio_file(db)
    older = PracticeRecord(
        audio_file_id=audio_file.id,
        sentence_index=0,
        sentence_text="hello world",
        storage_backend="local",
        recording_path="recordings/older.webm",
        accuracy_score=80.0,
        fluency_score=75.0,
        completeness_score=90.0,
        word_scores=[{"word": "hello", "accuracy_score": 80.0, "expected_phonemes": "hɛloʊ", "actual_phonemes": "hɛloʊ"}],
        created_at=datetime.utcnow(),
    )
    newer = PracticeRecord(
        audio_file_id=audio_file.id,
        sentence_index=0,
        sentence_text="hello world",
        storage_backend="local",
        recording_path="recordings/newer.webm",
        accuracy_score=92.0,
        fluency_score=88.0,
        completeness_score=100.0,
        word_scores=[{"word": "hello", "accuracy_score": 92.0, "expected_phonemes": "hɛloʊ", "actual_phonemes": "hɛloʊ"}],
        created_at=datetime.utcnow() + timedelta(seconds=5),
    )
    other_sentence = PracticeRecord(
        audio_file_id=audio_file.id,
        sentence_index=1,
        sentence_text="second sentence",
        storage_backend="local",
        recording_path="recordings/other.webm",
        accuracy_score=70.0,
        fluency_score=70.0,
        completeness_score=70.0,
        word_scores=[],
    )
    db.add_all([older, newer, other_sentence])
    db.flush()

    with _client(db, MockStorageService(), MockAlignmentService(), MockScoringService()) as client:
        response = client.get(f"/api/practice/{audio_file.id}/sentence/0/history")

    assert response.status_code == 200
    assert [item["accuracy_score"] for item in response.json()] == [92.0, 80.0]
