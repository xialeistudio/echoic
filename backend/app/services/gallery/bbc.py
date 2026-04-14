"""BBC Learning English content provider.

RSS feeds: https://podcasts.files.bbci.co.uk/{programme_id}.rss
Programme IDs verified April 2026.

COPYRIGHT NOTICE: BBC content is © BBC. This provider is intended for personal,
non-commercial, local use only. Remove this provider before deploying as a SaaS
service. See https://www.bbc.co.uk/usingthebbc/terms/
"""

import asyncio
import logging
from datetime import datetime, timezone

import httpx

from .base import ContentProvider, GalleryEpisode, parse_feed

logger = logging.getLogger(__name__)

PROGRAMS: list[dict] = [
    {
        "id": "6-minute-english",
        "name": "6 Minute English",
        "level": "upper-intermediate",
        "rss": "https://podcasts.files.bbci.co.uk/p02pc9tn.rss",
    },
    {
        "id": "learning-english-grammar",
        "name": "Learning English Grammar",
        "level": "intermediate",
        "rss": "https://podcasts.files.bbci.co.uk/p02pc9wq.rss",
    },
    {
        "id": "learning-english-vocabulary",
        "name": "Learning English Vocabulary",
        "level": "intermediate",
        "rss": "https://podcasts.files.bbci.co.uk/p02pc9xz.rss",
    },
    {
        "id": "learning-english-conversations",
        "name": "Learning English Conversations",
        "level": "intermediate",
        "rss": "https://podcasts.files.bbci.co.uk/p02pc9zn.rss",
    },
    {
        "id": "learning-english-from-the-news",
        "name": "Learning English from the News",
        "level": "upper-intermediate",
        "rss": "https://podcasts.files.bbci.co.uk/p05hw4bq.rss",
    },
    {
        "id": "learning-english-for-work",
        "name": "Learning English for Work",
        "level": "intermediate",
        "rss": "https://podcasts.files.bbci.co.uk/p0h6ffwg.rss",
    },
]

_cache: dict[str, dict] = {}
CACHE_TTL = 3600


async def _fetch_program(program: dict) -> list[GalleryEpisode]:
    # BBC's podcasts.files.bbci.co.uk has intermittent TLS issues with a shared
    # connection pool when multiple concurrent requests target the same host.
    # Use isolated clients with up to 3 attempts.
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(headers={"User-Agent": "Echoic/1.0"}) as client:
                resp = await client.get(program["rss"], timeout=15.0, follow_redirects=True)
                resp.raise_for_status()
                return parse_feed(resp.text, program, "bbc", "BBC Learning English")
        except Exception as e:
            last_exc = e
            if attempt < 2:
                await asyncio.sleep(0.5 * (attempt + 1))
    logger.warning("Failed to fetch BBC program %s after 3 attempts: %s", program["id"], last_exc)
    return []


class BBCProvider(ContentProvider):
    source = "bbc"
    source_label = "BBC Learning English"

    async def fetch(self) -> list[GalleryEpisode]:
        now = datetime.now(timezone.utc)
        cached = _cache.get("bbc")
        if cached and (now - cached["fetched_at"]).total_seconds() < CACHE_TTL:
            return cached["data"]

        results = await asyncio.gather(*[_fetch_program(p) for p in PROGRAMS])

        episodes: list[GalleryEpisode] = []
        for batch in results:
            episodes.extend(batch)
        episodes.sort(key=lambda e: e.pub_date, reverse=True)

        _cache["bbc"] = {"data": episodes, "fetched_at": now}
        return episodes
