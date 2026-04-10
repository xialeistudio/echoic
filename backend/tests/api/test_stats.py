from contextlib import contextmanager
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.models.practice_record import PracticeRecord


@contextmanager
def _client(db):
    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _record(created_at: datetime, accuracy: float, fluency: float, completeness: float) -> PracticeRecord:
    return PracticeRecord(
        audio_file_id=1,
        sentence_index=0,
        sentence_text="hello world",
        storage_backend="local",
        recording_path=f"recordings/{created_at.timestamp()}.webm",
        accuracy_score=accuracy,
        fluency_score=fluency,
        completeness_score=completeness,
        word_scores=[],
        created_at=created_at,
    )


def test_heatmap_returns_365_days(db):
    with _client(db) as client:
        response = client.get("/api/stats/heatmap")

    assert response.status_code == 200
    assert len(response.json()) == 365


def test_heatmap_counts_and_averages_correctly(db):
    today = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    db.add_all(
        [
            _record(today, 90.0, 60.0, 30.0),
            _record(today, 60.0, 60.0, 60.0),
            _record(yesterday, 30.0, 60.0, 90.0),
        ]
    )
    db.flush()

    with _client(db) as client:
        response = client.get("/api/stats/heatmap")

    assert response.status_code == 200
    body = response.json()
    by_date = {entry["date"]: entry for entry in body}

    today_entry = by_date[str(today.date())]
    yesterday_entry = by_date[str(yesterday.date())]

    # weights: accuracy=0.5, fluency=0.3, completeness=0.2
    # today:     record1=(90*0.5 + 60*0.3 + 30*0.2)=69, record2=(60*0.5 + 60*0.3 + 60*0.2)=60 → avg=64.5
    # yesterday: record3=(30*0.5 + 60*0.3 + 90*0.2)=51 → avg=51
    assert today_entry["count"] == 2
    assert today_entry["avg_score"] == 64.5
    assert yesterday_entry["count"] == 1
    assert yesterday_entry["avg_score"] == 51.0
