from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CollectionCreate(BaseModel):
    name: str


class CollectionRename(BaseModel):
    name: str


class CollectionResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    audio_count: int = 0

    model_config = ConfigDict(from_attributes=True)
