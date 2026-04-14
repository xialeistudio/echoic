from datetime import datetime
from pydantic import BaseModel, ConfigDict, computed_field


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float


class WordPhoneme(BaseModel):
    word: str
    ipa: str


class Sentence(BaseModel):
    index: int
    text: str
    start: float
    end: float
    words: list[WordTimestamp]
    analysis: str | None = None
    bookmarked: bool = False
    mastered: bool = False
    practice_count: int = 0


class AudioFileCreate(BaseModel):
    title: str | None = None
    url: str | None = None
    collection_id: int | None = None


class AudioFileResponse(BaseModel):
    id: int
    title: str
    source_type: str
    language: str
    collection_id: int | None = None
    sentences: list[Sentence] | None
    practice_count: int = 0
    created_at: datetime

    @computed_field
    @property
    def duration(self) -> float | None:
        if self.sentences:
            return self.sentences[-1].end
        return None

    model_config = ConfigDict(from_attributes=True)
