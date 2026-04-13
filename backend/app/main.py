import importlib.metadata
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import audio, practice, stats, collections
from app.config import settings

app = FastAPI(title="Echoic API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(practice.router, prefix="/api/practice", tags=["practice"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(collections.router, prefix="/api/collections", tags=["collections"])


@app.get("/api/version")
async def get_version():
    try:
        version = importlib.metadata.version("echoic-backend")
    except importlib.metadata.PackageNotFoundError:
        version = "dev"
    return {
        "version": version,
        "python": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    }


# SPA fallback: serve index.html for non-API 404s
_static_dir = Path(__file__).resolve().parent.parent / "static"
_index_html = _static_dir / "index.html"

if _static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="static-assets")

    class SPAFallbackMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            response: Response = await call_next(request)
            path = request.url.path
            if (
                response.status_code == 404
                and request.method == "GET"
                and not path.startswith("/api/")
                and not path.startswith("/assets/")
                and _index_html.is_file()
            ):
                return FileResponse(_index_html)
            return response

    app.add_middleware(SPAFallbackMiddleware)
