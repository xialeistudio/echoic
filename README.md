# Echoic

**AI-powered English pronunciation practice.** Import any audio, practice sentence by sentence, and get instant phoneme-level scoring.

[中文文档](./README_CN.md)

---

## Features

- **Audio Import** — Upload files or import from URL
- **Sentence Practice** — Practice each sentence with playback speed control
- **Pronunciation Scoring** — Real-time accuracy, fluency, and completeness scores
- **Phoneme Display** — Word-level IPA transcription for reference
- **AI Sentence Analysis** — Translation and grammar breakdown via OpenAI (optional)
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

## Prerequisites

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

## Quick Start

### 1. Clone

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
```

### 2. Database

```bash
# Start PostgreSQL via Docker (or use your own instance)
make db
```

### 3. Backend

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

### 4. Frontend (development only)

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
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5432/echoic` | PostgreSQL connection string |
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
| `LLM__OPENAI__API_KEY` | — | OpenAI API key (required for sentence analysis) |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | Model to use |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | API endpoint |

## Development

```bash
# Backend (with hot reload)
make dev-backend

# Frontend (with HMR)
make dev-frontend
```

The frontend dev server proxies `/api` requests to `http://localhost:8000`.

## License

[MIT](./LICENSE)
