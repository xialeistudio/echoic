from datetime import timezone

from fastapi import APIRouter, Query

from app.services.gallery.base import GalleryEpisode
from app.services.gallery.voa import VOAProvider, PROGRAMS as VOA_PROGRAMS
from app.services.gallery.bbc import BBCProvider, PROGRAMS as BBC_PROGRAMS

router = APIRouter()

_PROVIDERS = [VOAProvider(), BBCProvider()]

_SOURCES = [
    {"id": p.source, "label": p.source_label}
    for p in _PROVIDERS
]

_PROGRAMS = [
    {"id": prog["id"], "name": prog["name"], "level": prog["level"], "source": "voa"}
    for prog in VOA_PROGRAMS
] + [
    {"id": prog["id"], "name": prog["name"], "level": prog["level"], "source": "bbc"}
    for prog in BBC_PROGRAMS
]


@router.get("/")
async def list_gallery(
    source: str | None = Query(None),
    level: str | None = Query(None),
    program: str | None = Query(None),
):
    episodes: list[GalleryEpisode] = []
    cached_at: str | None = None

    for provider in _PROVIDERS:
        if source and provider.source != source:
            continue
        fetched = await provider.fetch()
        episodes.extend(fetched)

        import app.services.gallery.voa as _voa
        import app.services.gallery.bbc as _bbc
        mod_cache = _voa._cache if provider.source == "voa" else _bbc._cache
        entry = mod_cache.get(provider.source)
        if entry:
            ts = entry["fetched_at"].astimezone(timezone.utc).isoformat()
            if cached_at is None or ts < cached_at:
                cached_at = ts

    if level:
        episodes = [e for e in episodes if e.level == level]
    if program:
        episodes = [e for e in episodes if e.program_id == program]

    programs = _PROGRAMS if not source else [p for p in _PROGRAMS if p["source"] == source]

    return {
        "sources": _SOURCES,
        "programs": programs,
        "episodes": [e.model_dump() for e in episodes],
        "cached_at": cached_at,
    }
