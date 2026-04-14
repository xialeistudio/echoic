from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.audio_file import AudioFile
from app.models.practice_record import PracticeRecord
from app.schemas.practice import HeatmapEntry


class RecentPracticeEntry(BaseModel):
    record_id: int
    audio_file_id: int
    audio_title: str
    sentence_index: int
    sentence_text: str
    accuracy_score: float | None
    created_at: datetime


class PeriodStats(BaseModel):
    count: int
    avg_score: float | None


class SummaryStats(BaseModel):
    today: PeriodStats
    week: PeriodStats
    total: PeriodStats
    streak: int


router = APIRouter()


def _weighted_avg(db_avg):
    """Convert raw weighted average expression result to float or None."""
    return float(db_avg) if db_avg is not None else None


def _period_stats(db: Session, start: datetime | None) -> PeriodStats:
    q = db.query(func.count(PracticeRecord.id), func.avg(
        PracticeRecord.accuracy_score * settings.scoring.phoneme.accuracy_weight
        + PracticeRecord.fluency_score * settings.scoring.phoneme.fluency_weight
        + PracticeRecord.completeness_score * settings.scoring.phoneme.completeness_weight
    ))
    if start:
        q = q.filter(PracticeRecord.created_at >= start)
    count, avg = q.first()
    return PeriodStats(count=count or 0, avg_score=_weighted_avg(avg))


@router.get("/summary", response_model=SummaryStats)
async def get_summary(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    week_start = datetime.combine(today - timedelta(days=6), datetime.min.time())

    today_stats = _period_stats(db, today_start)
    week_stats = _period_stats(db, week_start)
    total_stats = _period_stats(db, None)

    # Streak: consecutive days (ending today or yesterday) with at least one practice
    active_dates = {
        row[0]
        for row in db.query(func.date(PracticeRecord.created_at))
        .group_by(func.date(PracticeRecord.created_at))
        .all()
    }
    streak = 0
    cursor = today
    # Allow streak to continue if today has no practice yet (count from yesterday)
    if cursor not in active_dates:
        cursor -= timedelta(days=1)
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return SummaryStats(today=today_stats, week=week_stats, total=total_stats, streak=streak)


@router.get("/heatmap", response_model=list[HeatmapEntry])
async def get_heatmap(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=364)

    rows = (
        db.query(
            func.date(PracticeRecord.created_at),
            func.count(PracticeRecord.id),
            func.avg(
                PracticeRecord.accuracy_score * settings.scoring.phoneme.accuracy_weight
                + PracticeRecord.fluency_score * settings.scoring.phoneme.fluency_weight
                + PracticeRecord.completeness_score * settings.scoring.phoneme.completeness_weight
            ),
        )
        .filter(PracticeRecord.created_at >= datetime.combine(start_date, datetime.min.time()))
        .group_by(func.date(PracticeRecord.created_at))
        .all()
    )

    daily = {
        str(day): HeatmapEntry(date=str(day), count=count, avg_score=float(avg) if avg is not None else None)
        for day, count, avg in rows
    }

    return [
        daily.get(
            str(day),
            HeatmapEntry(date=str(day), count=0, avg_score=None),
        )
        for day in (start_date + timedelta(days=offset) for offset in range(365))
    ]


@router.get("/recent", response_model=list[RecentPracticeEntry])
async def get_recent_practices(limit: int = 20, db: Session = Depends(get_db)):
    rows = (
        db.query(PracticeRecord, AudioFile.title)
        .join(AudioFile, PracticeRecord.audio_file_id == AudioFile.id)
        .order_by(PracticeRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        RecentPracticeEntry(
            record_id=r.id,
            audio_file_id=r.audio_file_id,
            audio_title=title,
            sentence_index=r.sentence_index,
            sentence_text=r.sentence_text,
            accuracy_score=r.accuracy_score,
            created_at=r.created_at,
        )
        for r, title in rows
    ]
