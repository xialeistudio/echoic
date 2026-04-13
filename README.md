# Echoic

**AI-powered English pronunciation practice.** Import any audio, practice sentence by sentence, and get instant phoneme-level scoring.

[中文文档](./README_CN.md)

---

## Features

- **Audio Import** — Upload files or import from URL
- **Sentence Practice** — Practice each sentence with playback speed control
- **Pronunciation Scoring** — Real-time accuracy, fluency, and completeness scores
- **Phoneme Display** — Word-level IPA transcription for reference
- **AI Sentence Analysis** — Translation and grammar breakdown via OpenAI or local Ollama (optional)
- **Practice History** — Track every attempt with scores per sentence
- **Practice Heatmap** — 365-day visual activity overview
- **Bookmarks** — Mark sentences for focused review

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, WaveSurfer.js |
| Backend | FastAPI, SQLAlchemy, Alembic |
| ASR | WhisperX (faster-whisper + CTranslate2) |
| Alignment | wav2vec2 |
| Scoring | wav2vec2 + phonemizer |
| Database | PostgreSQL 16 |

## Quick Start (Docker)

The easiest way to run Echoic. Only requires [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
docker compose up
```

Open http://localhost:8000 in your browser.

> **First run note:** The ASR and alignment models (~1 GB) are downloaded automatically on first use and cached in a Docker volume. Subsequent starts are instant.

### Optional: AI Sentence Analysis

To enable grammar analysis, create a `.env` file in the project root before running `docker compose up`:

**Using OpenAI:**
```env
LLM__BACKEND=openai
LLM__OPENAI__API_KEY=sk-...
LLM__OPENAI__MODEL=gpt-4o-mini
```

**Using Ollama (local, no API key):**

First install [Ollama](https://ollama.com) and pull a model:
```bash
ollama pull qwen3.5:2b
```

Then create `.env`:
```env
LLM__BACKEND=ollama
LLM__OLLAMA__BASE_URL=http://host.docker.internal:11434
LLM__OLLAMA__MODEL=qwen3.5:2b
LLM__OLLAMA__NUM_CTX=512
```

> `host.docker.internal` lets the container reach Ollama running on your host machine. On Linux, use your host IP address instead.

---

## Manual Setup (without Docker)

### Prerequisites

- Python 3.11+
- Node.js 20+ and pnpm
- PostgreSQL 16
- ffmpeg
- espeak-ng

**macOS (Homebrew):**
```bash
brew install ffmpeg espeak-ng postgresql@16
```

**Ubuntu / Debian:**
```bash
sudo apt install ffmpeg espeak-ng postgresql
```

### Steps

#### 1. Clone

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
```

#### 2. Database

```bash
# Start PostgreSQL via Docker (or use your own instance)
make db
```

#### 3. Backend

```bash
cd backend

# Install dependencies
uv sync

# Copy and edit environment variables
cp .env.example .env

# Run database migrations
uv run alembic upgrade head

# Start the server
cd .. && make run
```

#### 4. Frontend (development only)

In a separate terminal:

```bash
make dev-frontend
```

For production, build the frontend first (output goes to `backend/static`):

```bash
make build
```

Then `make run` serves both the API and the frontend at `http://localhost:8000`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and adjust as needed.

### Core

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5433/echoic` | PostgreSQL connection string (5433 avoids conflict with a local postgres) |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (JSON array) |

### ASR

| Variable | Default | Description |
|---|---|---|
| `ASR__BACKEND` | `whisperx` | ASR backend |
| `ASR__WHISPERX__MODEL_SIZE` | `base` | Model size: `tiny` `base` `small` `medium` `large-v2` |
| `ASR__WHISPERX__DEVICE` | `cpu` | `cpu` or `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | `int8` `float16` `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | Target language code |

### Alignment & Scoring

| Variable | Default | Description |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` `cuda` `mps` (Apple Silicon) |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` `cuda` `mps` |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | Weight for accuracy component |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | Weight for fluency component |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | Weight for completeness component |

### Storage

| Variable | Default | Description |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` or `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | Local storage directory |
| `STORAGE__S3_BUCKET` | — | S3 bucket name |
| `STORAGE__S3_PREFIX` | `echoic/` | S3 key prefix |

### LLM (Optional)

| Variable | Default | Description |
|---|---|---|
| `LLM__BACKEND` | — | `openai` or `ollama` |
| `LLM__OPENAI__API_KEY` | — | OpenAI API key |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | OpenAI model |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| `LLM__OLLAMA__BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `LLM__OLLAMA__MODEL` | `llama3` | Ollama model name |
| `LLM__OLLAMA__NUM_CTX` | `512` | Context window (512 is enough for sentence analysis) |
| `LLM__OLLAMA__THINK` | `false` | Enable thinking mode for supported models (e.g. qwen3.5) |

## Development

```bash
# Terminal 1 — database (exposed on localhost:5433, won't conflict with a local postgres)
docker compose up db

# Terminal 2 — backend with hot reload
make dev-backend

# Terminal 3 — frontend with HMR
make dev-frontend
```

Open http://localhost:5173. The frontend dev server proxies `/api` to the backend.

Create `docker-compose.override.yml` to expose the database port (not committed to git):

```yaml
services:
  db:
    ports:
      - "5433:5432"
```

Then set `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgresql://echoic:echoic@localhost:5433/echoic
```

## License

[MIT](./LICENSE)
