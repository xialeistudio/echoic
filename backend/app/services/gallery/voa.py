"""VOA Learning English content provider.

RSS feeds served at:
  Audio programs:  https://learningenglish.voanews.com/podcast/?zoneId={id}
  Video programs:  https://learningenglish.voanews.com/podcast/video.aspx?zoneId={id}

Zone IDs verified April 2026. VOA content is U.S. Government work (public domain).
"""

import asyncio
import logging
from datetime import datetime, timezone

import httpx

from .base import ContentProvider, GalleryEpisode, parse_feed

logger = logging.getLogger(__name__)

PROGRAMS: list[dict] = [
    {
        "id": "how-to-pronounce",
        "name": "How to Pronounce",
        "level": "beginner",
        "rss": "https://learningenglish.voanews.com/podcast/video.aspx?zoneId=6042",
    },
    {
        "id": "english-in-a-minute",
        "name": "English in a Minute",
        "level": "beginner",
        "rss": "https://learningenglish.voanews.com/podcast/video.aspx?zoneId=3619",
    },
    {
        "id": "everyday-grammar",
        "name": "Everyday Grammar",
        "level": "elementary",
        "rss": "https://learningenglish.voanews.com/podcast/?zoneId=4456",
    },
    {
        "id": "words-and-their-stories",
        "name": "Words and Their Stories",
        "level": "elementary",
        "rss": "https://learningenglish.voanews.com/podcast/?zoneId=987",
    },
    {
        "id": "ask-a-teacher",
        "name": "Ask a Teacher",
        "level": "elementary",
        "rss": "https://learningenglish.voanews.com/podcast/?zoneId=5535",
    },
    {
        "id": "news-words",
        "name": "News Words",
        "level": "elementary",
        "rss": "https://learningenglish.voanews.com/podcast/video.aspx?zoneId=3620",
    },
    {
        "id": "as-it-is",
        "name": "As It Is",
        "level": "intermediate",
        "rss": "https://learningenglish.voanews.com/podcast/?zoneId=3521",
    },
    {
        "id": "health-lifestyle",
        "name": "Health & Lifestyle",
        "level": "intermediate",
        "rss": "https://learningenglish.voanews.com/podcast/?zoneId=955",
    },
    {
        "id": "american-stories",
        "name": "American Stories",
        "level": "intermediate",
        "rss": "https://learningenglish.voanews.com/podcast/?zoneId=1581",
    },
    {
        "id": "science-technology",
        "name": "Science & Technology",
        "level": "upper-intermediate",
        "rss": "https://learningenglish.voanews.com/podcast/?zoneId=1579",
    },
]

_cache: dict[str, dict] = {}
CACHE_TTL = 3600


async def _fetch_program(client: httpx.AsyncClient, program: dict) -> list[GalleryEpisode]:
    try:
        resp = await client.get(program["rss"], timeout=15.0, follow_redirects=True)
        resp.raise_for_status()
        return parse_feed(resp.text, program, "voa", "VOA Learning English")
    except Exception as e:
        logger.warning("Failed to fetch VOA program %s: %s", program["id"], e)
        return []


class VOAProvider(ContentProvider):
    source = "voa"
    source_label = "VOA Learning English"

    async def fetch(self) -> list[GalleryEpisode]:
        now = datetime.now(timezone.utc)
        cached = _cache.get("voa")
        if cached and (now - cached["fetched_at"]).total_seconds() < CACHE_TTL:
            return cached["data"]

        async with httpx.AsyncClient(headers={"User-Agent": "Echoic/1.0"}) as client:
            results = await asyncio.gather(*[_fetch_program(client, p) for p in PROGRAMS])

        episodes: list[GalleryEpisode] = []
        for batch in results:
            episodes.extend(batch)
        episodes.sort(key=lambda e: e.pub_date, reverse=True)

        _cache["voa"] = {"data": episodes, "fetched_at": now}
        return episodes
