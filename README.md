# Echoic

**AI-powered speaking practice.** Import any audio, practice sentence by sentence, and get instant phoneme-level pronunciation scoring.

[English](./README.md) · [简体中文](./README_CN.md) · [繁體中文](./README_TW.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md)

---

![Echoic demo](./demo.gif)

---

## Features

- **Content Gallery** — Browse and import curated episodes from VOA Learning English and BBC Learning English
- **Audio Import** — Upload local files or import from any direct audio URL
- **Collections** — Organise audio into named collections
- **Sentence Practice** — Practice each sentence with adjustable playback speed (0.5×–2×)
- **Pronunciation Scoring** — Accuracy, fluency, and completeness scores with word-level breakdown
- **Phoneme Display** — IPA transcription per word; phonemes colour-coded by score after assessment
- **Word Error Review** — Aggregate word accuracy across all sessions to identify weak spots
- **A/B Compare** — Play original then your recording back-to-back in one click
- **AI Sentence Analysis** — Translation and grammar breakdown via OpenAI or local Ollama (optional)
- **Practice History** — Every attempt saved with full score details; click to replay any recording
- **Sentence States** — Bookmark sentences for review; mark sentences as mastered to hide them
- **Sentence Search** — Filter sentences by text within any audio file
- **Practice Heatmap** — 365-day activity calendar on the overview page
- **Keyboard Shortcuts** — Space / R / Enter / ←→ / Esc for hands-free practice flow
- **Dark Mode** — Light, dark, and system-follow themes
- **Multi-language Learning** — Practice English, French, and German; phoneme scoring adapts per language
- **Multilingual UI** — English, Simplified Chinese, Traditional Chinese, Japanese, Korean, French, German

## Supported Learning Languages

| Language | `ASR__WHISPERX__LANGUAGE` | `ALIGNMENT__WAV2VEC2__LANGUAGE` | `SCORING__PHONEME__LANGUAGE` |
|---|---|---|---|
| English | `en` | `en` | `en-us` |
| French | `fr` | `fr` | `fr-fr` |
| German | `de` | `de` | `de` |
| Japanese | `ja` | `ja` | `ja` |

> Phoneme scoring uses [`facebook/wav2vec2-lv-60-espeak-cv-ft`](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft) for all languages. Alignment models are downloaded automatically by whisperx on first use.

To switch learning language, set three variables in `.env`:

```env
ASR__WHISPERX__LANGUAGE=fr
ALIGNMENT__WAV2VEC2__LANGUAGE=fr
SCORING__PHONEME__LANGUAGE=fr-fr
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, shadcn/ui, WaveSurfer.js |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL 16 |
| ASR | WhisperX (faster-whisper + CTranslate2) |
| Alignment | wav2vec2 |
| Scoring | wav2vec2 + phonemizer |
| LLM | OpenAI API / Ollama (optional) |

## Quick Start (Docker)

The easiest way to run Echoic. Requires only [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
docker compose up
```

Open **http://localhost:8000** in your browser.

> **First run:** The ASR and alignment models (~1 GB) download automatically on first use and are cached in a Docker volume. Subsequent starts are instant.

### Enable AI Sentence Analysis (optional)

Create a `.env` file in the project root before running `docker compose up`.

**OpenAI:**
```env
LLM__BACKEND=openai
LLM__OPENAI__API_KEY=sk-...
LLM__OPENAI__MODEL=gpt-4o-mini
# Any OpenAI-compatible endpoint is supported:
# LLM__OPENAI__BASE_URL=https://api.openai.com/v1
```

**Ollama (local, no API key):**

Install [Ollama](https://ollama.com) and pull a model first:
```bash
ollama pull qwen2.5:3b
```

Then create `.env`:
```env
LLM__BACKEND=ollama
LLM__OLLAMA__BASE_URL=http://host.docker.internal:11434
LLM__OLLAMA__MODEL=qwen2.5:3b
LLM__OLLAMA__NUM_CTX=512
```

> `host.docker.internal` lets the container reach Ollama on your host machine. On Linux, replace it with your host IP.

---

## Manual Setup

### Prerequisites

- Python 3.11+, [uv](https://docs.astral.sh/uv/)
- Node.js 20+, [pnpm](https://pnpm.io)
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

```bash
# 1. Clone
git clone https://github.com/xialeistudio/echoic.git
cd echoic

# 2. Start PostgreSQL
make db                          # starts postgres via Docker on port 5433

# 3. Backend
cd backend
uv sync
cp .env.example .env             # edit as needed
uv run alembic upgrade head
cd .. && make run                # serves on http://localhost:8000

# 4. Frontend (development only — skip for production)
make dev-frontend                # http://localhost:5173
```

For **production**, build the frontend first; it gets bundled into the backend:

```bash
make build   # outputs to backend/static/
make run     # serves API + frontend at http://localhost:8000
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. All variables are optional except `DATABASE_URL`.

### Core

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5433/echoic` | PostgreSQL connection string |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (JSON array) |

### ASR

> WhisperX uses CTranslate2, which **does not** support MPS (Apple Silicon GPU). Use `cpu` on macOS.

| Variable | Default | Description |
|---|---|---|
| `ASR__WHISPERX__MODEL_SIZE` | `base` | `tiny` · `base` · `small` · `medium` · `large-v2` — larger = more accurate, slower |
| `ASR__WHISPERX__DEVICE` | `cpu` | `cpu` or `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | `int8` · `float16` · `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | Language code for transcription |

### Alignment & Scoring

> These use PyTorch — MPS **is** supported on Apple Silicon.

| Variable | Default | Description |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `ALIGNMENT__WAV2VEC2__LANGUAGE` | `en` | Language code — must match `ASR__WHISPERX__LANGUAGE` |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `SCORING__PHONEME__LANGUAGE` | `en-us` | espeak language code (`en-us` · `fr-fr` · `de` · `ja` …) |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | Weight of accuracy in the final score |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | Weight of fluency |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | Weight of completeness |

### Storage

| Variable | Default | Description |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` or `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | Directory for uploaded audio and recordings |
| `STORAGE__S3_BUCKET` | — | S3 bucket name (when `STORAGE__BACKEND=s3`) |
| `STORAGE__S3_PREFIX` | `echoic/` | S3 key prefix |

### LLM (optional)

Required only for the "Translation & Analysis" feature.

| Variable | Default | Description |
|---|---|---|
| `LLM__BACKEND` | — | `openai` or `ollama` — leave unset to disable |
| `LLM__OPENAI__API_KEY` | — | OpenAI API key |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | Model name |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint |
| `LLM__OLLAMA__BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `LLM__OLLAMA__MODEL` | `llama3` | Ollama model name |
| `LLM__OLLAMA__NUM_CTX` | `512` | Context size (512 is enough for sentence analysis) |
| `LLM__OLLAMA__THINK` | `false` | Enable thinking mode (e.g. for qwen3) |

---

## Development

```bash
# Terminal 1 — database (port 5433, avoids conflict with a local postgres)
docker compose up db

# Terminal 2 — backend with hot reload
make dev-backend

# Terminal 3 — frontend with HMR
make dev-frontend
```

Open **http://localhost:5173**. The dev server proxies `/api` to the backend at port 8000.

The `docker-compose.override.yml` exposes the database on `localhost:5433` and is already in `.gitignore` — you can add your own local overrides there.

---

## Keyboard Shortcuts

Available on the Practice page:

| Key | Action |
|---|---|
| `Space` | Play / pause original audio |
| `R` | Start / finish recording |
| `Enter` | Submit recording for assessment |
| `← →` | Previous / next sentence |
| `Esc` | Cancel recording |

---

## Data Backup

All persistent data lives in two places:

- **Database**: Docker volume `postgres_data` — practice records, scores, sentence states
- **Audio files**: Docker volume `storage` — uploaded audio and recordings

Copy both volumes when migrating or backing up.

---

## License

[MIT](./LICENSE)
