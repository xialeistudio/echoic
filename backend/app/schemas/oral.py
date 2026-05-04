from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.schemas.practice import WordScore


class OralQuestionResponse(BaseModel):
    prompt: str
    reference_text: str | None


class OralAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_type: str
    question_language: str
    question_difficulty: str | None
    question_prompt: str
    question_reference: str | None
    accuracy_score: float | None
    fluency_score: float | None
    completeness_score: float | None
    word_scores: list[WordScore] | None
    transcription: str | None
    llm_score: float | None
    llm_feedback: str | None
    llm_highlights: list[str] | None
    timer_secs: int | None
    created_at: datetime


class OralAttemptSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_type: str
    question_language: str
    question_difficulty: str | None
    question_prompt: str
    accuracy_score: float | None
    fluency_score: float | None
    llm_score: float | None
    timer_secs: int | None
    created_at: datetime
