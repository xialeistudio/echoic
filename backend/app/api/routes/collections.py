from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.collection import Collection
from app.models.audio_file import AudioFile
from app.schemas.collection import CollectionCreate, CollectionRename, CollectionResponse

router = APIRouter()


def _to_response(col: Collection, db: Session) -> CollectionResponse:
    count = db.query(func.count(AudioFile.id)).filter(AudioFile.collection_id == col.id).scalar() or 0
    return CollectionResponse(
        id=col.id,
        name=col.name,
        created_at=col.created_at,
        audio_count=count,
    )


@router.get("/", response_model=list[CollectionResponse])
def list_collections(db: Session = Depends(get_db)):
    cols = db.query(Collection).order_by(Collection.created_at).all()
    return [_to_response(c, db) for c in cols]


@router.post("/", response_model=CollectionResponse, status_code=201)
def create_collection(payload: CollectionCreate, db: Session = Depends(get_db)):
    col = Collection(name=payload.name.strip())
    db.add(col)
    db.flush()
    db.refresh(col)
    return _to_response(col, db)


@router.put("/{collection_id}", response_model=CollectionResponse)
def rename_collection(collection_id: int, payload: CollectionRename, db: Session = Depends(get_db)):
    col = db.get(Collection, collection_id)
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    col.name = payload.name.strip()
    db.flush()
    return _to_response(col, db)


@router.delete("/{collection_id}", status_code=204)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    col = db.get(Collection, collection_id)
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    # audio_files.collection_id SET NULL via FK ondelete
    db.delete(col)
