# Echoic

**KI-gestütztes Sprechtraining.** Importiere beliebige Audiodateien, übe Satz für Satz und erhalte sofortige Aussprache-Bewertungen auf Phonem-Ebene.

[English](./README.md) · [简体中文](./README_CN.md) · [繁體中文](./README_TW.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md)

---

![Echoic Demo](./demo.gif)

---

## Funktionen

- **Inhaltsgalerie** — Durchsuche und importiere kuratierte Episoden von VOA Learning English und BBC Learning English
- **Audio-Import** — Lokale Dateien hochladen oder von beliebigen direkten URLs importieren
- **Sammlungen** — Audio in benannte Sammlungen organisieren
- **Satzweises Üben** — Übe jeden Satz mit einstellbarer Wiedergabegeschwindigkeit (0,5×–2×)
- **Aussprache-Bewertung** — Genauigkeit, Flüssigkeit und Vollständigkeit mit wortgenauen Details
- **Phonem-Anzeige** — IPA-Transkription pro Wort; Phoneme nach Bewertung farbcodiert
- **Wort-Review** — Aggregiere Wortgenauigkeit über alle Sitzungen zur Schwachstellenanalyse
- **A/B-Vergleich** — Original und Aufnahme mit einem Klick nacheinander abspielen
- **KI-Satzanalyse** — Übersetzung und Grammatikanalyse über OpenAI oder lokales Ollama (optional)
- **Übungshistorie** — Jeder Versuch mit vollständigen Score-Details gespeichert; Aufnahmen per Klick abspielen
- **Satz-Status** — Sätze für die Wiederholung markieren; als gemeistert markieren zum Ausblenden
- **Satzsuche** — Sätze nach Text in jeder Audiodatei filtern
- **Übungs-Heatmap** — 365-Tage-Aktivitätskalender
- **Tastaturkürzel** — Leertaste / R / Enter / ←→ / Esc für freihändiges Üben
- **Dunkelmodus** — Hell-, Dunkel- und System-Modus
- **Mehrsprachiges Lernen** — Übe Englisch, Französisch und Deutsch; Aussprache-Scoring passt sich automatisch der Sprache an
- **Mehrsprachige Oberfläche** — Deutsch, Englisch, Vereinfachtes Chinesisch, Traditionelles Chinesisch, Japanisch, Koreanisch, Französisch

## Unterstützte Lernsprachen

| Sprache | `ASR__WHISPERX__LANGUAGE` | `ALIGNMENT__WAV2VEC2__LANGUAGE` | `SCORING__PHONEME__LANGUAGE` |
|---|---|---|---|
| Englisch | `en` | `en` | `en-us` |
| Französisch | `fr` | `fr` | `fr-fr` |
| Deutsch | `de` | `de` | `de` |

Zum Wechseln der Lernsprache drei Variablen in `.env` setzen:

```env
ASR__WHISPERX__LANGUAGE=fr
ALIGNMENT__WAV2VEC2__LANGUAGE=fr
SCORING__PHONEME__LANGUAGE=fr-fr
```

## Tech-Stack

| Ebene | Technologie |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, shadcn/ui, WaveSurfer.js |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Datenbank | PostgreSQL 16 |
| ASR | WhisperX (faster-whisper + CTranslate2) |
| Ausrichtung | wav2vec2 |
| Bewertung | wav2vec2 + phonemizer |
| LLM | OpenAI API / Ollama (optional) |

## Schnellstart (Docker)

Die einfachste Methode. Benötigt nur [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
docker compose up
```

Öffne **http://localhost:8000** im Browser.

> **Erster Start:** Die ASR- und Ausrichtungsmodelle (~1 GB) werden beim ersten Einsatz automatisch heruntergeladen und in einem Docker-Volume gecacht. Weitere Starts sind sofort.

### KI-Satzanalyse aktivieren (optional)

Erstelle eine `.env`-Datei im Projektverzeichnis vor `docker compose up`.

**OpenAI:**
```env
LLM__BACKEND=openai
LLM__OPENAI__API_KEY=sk-...
LLM__OPENAI__MODEL=gpt-4o-mini
# Jeder OpenAI-kompatible Endpunkt wird unterstützt:
# LLM__OPENAI__BASE_URL=https://api.openai.com/v1
```

**Ollama (lokal, kein API-Schlüssel erforderlich):**

Installiere [Ollama](https://ollama.com) und lade ein Modell herunter:
```bash
ollama pull qwen2.5:3b
```

Erstelle `.env`:
```env
LLM__BACKEND=ollama
LLM__OLLAMA__BASE_URL=http://host.docker.internal:11434
LLM__OLLAMA__MODEL=qwen2.5:3b
LLM__OLLAMA__NUM_CTX=512
```

> `host.docker.internal` ermöglicht dem Container den Zugriff auf Ollama auf dem Host. Unter Linux durch die Host-IP ersetzen.

---

## Manuelle Installation

### Voraussetzungen

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

### Schritte

```bash
# 1. Klonen
git clone https://github.com/xialeistudio/echoic.git
cd echoic

# 2. PostgreSQL starten
make db                          # startet PostgreSQL via Docker auf Port 5433

# 3. Backend
cd backend
uv sync
cp .env.example .env             # nach Bedarf bearbeiten
uv run alembic upgrade head
cd .. && make run                # läuft auf http://localhost:8000

# 4. Frontend (nur Entwicklung)
make dev-frontend                # http://localhost:5173
```

Für **Produktion** zuerst das Frontend bauen:

```bash
make build   # Ausgabe in backend/static/
make run     # API + Frontend unter http://localhost:8000
```

---

## Umgebungsvariablen

Kopiere `backend/.env.example` nach `backend/.env`. Alle Variablen sind optional außer `DATABASE_URL`.

### Kern

| Variable | Standard | Beschreibung |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5433/echoic` | PostgreSQL-Verbindungsstring |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Erlaubte CORS-Ursprünge (JSON-Array) |

### ASR

> WhisperX verwendet CTranslate2, das MPS (Apple Silicon GPU) **nicht unterstützt**. Verwende `cpu` auf macOS.

| Variable | Standard | Beschreibung |
|---|---|---|
| `ASR__WHISPERX__MODEL_SIZE` | `base` | `tiny` · `base` · `small` · `medium` · `large-v2` — größer = genauer, langsamer |
| `ASR__WHISPERX__DEVICE` | `cpu` | `cpu` oder `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | `int8` · `float16` · `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | Sprachcode für die Transkription |

### Ausrichtung & Bewertung

> Verwendet PyTorch — MPS **wird** auf Apple Silicon unterstützt.

| Variable | Standard | Beschreibung |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `ALIGNMENT__WAV2VEC2__LANGUAGE` | `en` | Sprachcode — muss mit `ASR__WHISPERX__LANGUAGE` übereinstimmen |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `SCORING__PHONEME__LANGUAGE` | `en-us` | espeak-Sprachcode (`en-us` · `fr-fr` · `de` · `ja` …) |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | Gewichtung der Genauigkeit |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | Gewichtung der Flüssigkeit |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | Gewichtung der Vollständigkeit |

### Speicher

| Variable | Standard | Beschreibung |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` oder `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | Lokales Verzeichnis für Audio und Aufnahmen |
| `STORAGE__S3_BUCKET` | — | S3-Bucket-Name (wenn `STORAGE__BACKEND=s3`) |
| `STORAGE__S3_PREFIX` | `echoic/` | S3-Schlüsselpräfix |

### LLM (optional)

Nur für die Funktion „Übersetzung & Analyse" erforderlich.

| Variable | Standard | Beschreibung |
|---|---|---|
| `LLM__BACKEND` | — | `openai` oder `ollama` — leer lassen zum Deaktivieren |
| `LLM__OPENAI__API_KEY` | — | OpenAI API-Schlüssel |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | Modellname |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | Jeder OpenAI-kompatible Endpunkt |
| `LLM__OLLAMA__BASE_URL` | `http://localhost:11434` | Ollama-Server-URL |
| `LLM__OLLAMA__MODEL` | `llama3` | Ollama-Modellname |
| `LLM__OLLAMA__NUM_CTX` | `512` | Kontextgröße (512 reicht für Satzanalyse) |
| `LLM__OLLAMA__THINK` | `false` | Denkmodus aktivieren (z.B. qwen3) |

---

## Entwicklung

```bash
# Terminal 1 — Datenbank (Port 5433)
docker compose up db

# Terminal 2 — Backend mit Hot-Reload
make dev-backend

# Terminal 3 — Frontend mit HMR
make dev-frontend
```

Öffne **http://localhost:5173**. Der Dev-Server proxied `/api` zum Backend auf Port 8000.

---

## Tastaturkürzel

Verfügbar auf der Übungsseite:

| Taste | Aktion |
|---|---|
| `Leertaste` | Original-Audio abspielen / pausieren |
| `R` | Aufnahme starten / beenden |
| `Enter` | Zur Bewertung einreichen |
| `← →` | Vorheriger / nächster Satz |
| `Esc` | Aufnahme abbrechen |

---

## Datensicherung

Alle Daten werden an zwei Orten gespeichert:

- **Datenbank**: Docker-Volume `postgres_data` (Übungsaufzeichnungen, Scores, Satz-Status)
- **Audiodateien**: Docker-Volume `storage` (hochgeladene Audiodateien und Aufnahmen)

Kopiere beide Volumes bei Migration oder Sicherung.

---

## Lizenz

[MIT](./LICENSE)
