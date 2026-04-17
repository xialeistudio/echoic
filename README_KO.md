# Echoic

**AI 기반 스피킹 연습 도구.** 음성을 가져와 문장별로 연습하고 즉각적인 음소 수준의 발음 점수를 받아보세요.

[English](./README.md) · [简体中文](./README_CN.md) · [繁體中文](./README_TW.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md)

---

![Echoic 데모](./demo.gif)

---

## 기능

- **콘텐츠 갤러리** — VOA Learning English, BBC Learning English의 엄선된 에피소드를 탐색하고 가져오기
- **음성 가져오기** — 로컬 파일 업로드 또는 직접 URL에서 가져오기
- **컬렉션** — 음성을 컬렉션으로 정리
- **문장별 연습** — 0.5×~2× 속도 조절로 문장별 연습
- **발음 점수** — 정확도·유창성·완성도 3가지 점수, 단어 수준 상세 포함
- **음소 표시** — 단어별 IPA 표기 표시；채점 후 점수별 색상으로 음소 표시
- **단어 복습** — 모든 세션의 단어 정확도 집계로 취약점 파악
- **A/B 비교** — 원본과 녹음을 한 번에 연속 재생
- **AI 문장 분석** — OpenAI 또는 로컬 Ollama를 통한 번역·문법 분석（선택 사항）
- **연습 기록** — 모든 시도를 점수와 함께 저장；기록 클릭으로 녹음 재생
- **문장 상태** — 복습을 위한 북마크；습득 완료로 표시하여 숨기기
- **문장 검색** — 모든 음성 파일 내 텍스트로 문장 검색
- **연습 히트맵** — 365일 활동 캘린더
- **키보드 단축키** — Space / R / Enter / ←→ / Esc로 핸즈프리 연습
- **다크 모드** — 라이트·다크·시스템 따라가기
- **다국어 학습** — 영어, 프랑스어, 독일어 연습；발음 점수가 언어별로 자동 적용
- **다국어 UI** — 한국어, 영어, 중국어 간체, 중국어 번체, 일본어, 프랑스어, 독일어

## 지원 학습 언어

| 언어 | `ASR__WHISPERX__LANGUAGE` | `ALIGNMENT__WAV2VEC2__LANGUAGE` | `SCORING__PHONEME__LANGUAGE` |
|---|---|---|---|
| 영어 | `en` | `en` | `en-us` |
| 프랑스어 | `fr` | `fr` | `fr-fr` |
| 독일어 | `de` | `de` | `de` |
| 일본어 | `ja` | `ja` | `ja` |

> 음소 채점 모델은 모든 언어에 공통으로 [`facebook/wav2vec2-lv-60-espeak-cv-ft`](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft)를 사용합니다. 정렬 모델은 whisperx가 첫 사용 시 자동으로 다운로드합니다.

학습 언어를 변경하려면 `.env`에서 세 가지 변수를 설정합니다：

```env
ASR__WHISPERX__LANGUAGE=fr
ALIGNMENT__WAV2VEC2__LANGUAGE=fr
SCORING__PHONEME__LANGUAGE=fr-fr
```

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | React 18, Vite, Tailwind CSS v4, shadcn/ui, WaveSurfer.js |
| 백엔드 | FastAPI, SQLAlchemy, Alembic |
| 데이터베이스 | PostgreSQL 16 |
| ASR | WhisperX (faster-whisper + CTranslate2) |
| 정렬 | wav2vec2 |
| 채점 | wav2vec2 + phonemizer |
| LLM | OpenAI API / Ollama (선택 사항) |

## 빠른 시작 (Docker)

가장 간단한 실행 방법입니다. [Docker](https://docs.docker.com/get-docker/)만 필요합니다.

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
docker compose up
```

브라우저에서 **http://localhost:8000**을 엽니다.

> **첫 실행 시：** ASR 및 정렬 모델(약 1 GB)이 최초 사용 시 자동으로 다운로드되어 Docker Volume에 캐시됩니다. 이후 시작은 즉시 됩니다.

### AI 문장 분석 활성화 (선택 사항)

`docker compose up` 실행 전 프로젝트 루트에 `.env` 파일을 생성합니다.

**OpenAI：**
```env
LLM__BACKEND=openai
LLM__OPENAI__API_KEY=sk-...
LLM__OPENAI__MODEL=gpt-4o-mini
# OpenAI 호환 엔드포인트 지원：
# LLM__OPENAI__BASE_URL=https://api.openai.com/v1
```

**Ollama (로컬, API 키 불필요)：**

[Ollama](https://ollama.com) 설치 후 모델 다운로드：
```bash
ollama pull qwen2.5:3b
```

`.env` 생성：
```env
LLM__BACKEND=ollama
LLM__OLLAMA__BASE_URL=http://host.docker.internal:11434
LLM__OLLAMA__MODEL=qwen2.5:3b
LLM__OLLAMA__NUM_CTX=512
```

> `host.docker.internal`은 컨테이너에서 호스트의 Ollama에 접근합니다. Linux에서는 호스트 IP로 교체하세요.

---

## 수동 설정

### 필수 환경

- Python 3.11+, [uv](https://docs.astral.sh/uv/)
- Node.js 20+, [pnpm](https://pnpm.io)
- PostgreSQL 16
- ffmpeg
- espeak-ng

**macOS (Homebrew)：**
```bash
brew install ffmpeg espeak-ng postgresql@16
```

**Ubuntu / Debian：**
```bash
sudo apt install ffmpeg espeak-ng postgresql
```

### 시작 단계

```bash
# 1. 클론
git clone https://github.com/xialeistudio/echoic.git
cd echoic

# 2. PostgreSQL 시작
make db                          # Docker로 5433 포트에서 시작

# 3. 백엔드
cd backend
uv sync
cp .env.example .env             # 필요에 따라 편집
uv run alembic upgrade head
cd .. && make run                # http://localhost:8000에서 실행

# 4. 프론트엔드 (개발 시에만)
make dev-frontend                # http://localhost:5173
```

**프로덕션**에서는 프론트엔드를 먼저 빌드합니다：

```bash
make build   # backend/static/에 출력
make run     # API + 프론트엔드를 http://localhost:8000에서 제공
```

---

## 환경 변수

`backend/.env.example`을 `backend/.env`로 복사합니다. `DATABASE_URL` 외에는 모두 선택 사항입니다.

### 핵심

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5433/echoic` | PostgreSQL 연결 문자열 |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 허용된 CORS 출처 (JSON 배열) |

### ASR

> WhisperX는 CTranslate2를 사용하며 MPS(Apple Silicon GPU)를 **지원하지 않습니다**. macOS에서는 `cpu`를 사용하세요.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `ASR__WHISPERX__MODEL_SIZE` | `base` | `tiny` · `base` · `small` · `medium` · `large-v2` — 클수록 정확하지만 느림 |
| `ASR__WHISPERX__DEVICE` | `cpu` | `cpu` 또는 `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | `int8` · `float16` · `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | 전사 대상 언어 코드 |

### 정렬 및 채점

> PyTorch 사용 — Apple Silicon의 MPS **지원됨**.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `ALIGNMENT__WAV2VEC2__LANGUAGE` | `en` | 언어 코드 — `ASR__WHISPERX__LANGUAGE`와 일치시킬 것 |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `SCORING__PHONEME__LANGUAGE` | `en-us` | espeak 언어 코드 (`en-us` · `fr-fr` · `de` · `ja` …) |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | 정확도 가중치 |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | 유창성 가중치 |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | 완성도 가중치 |

### 스토리지

| 변수 | 기본값 | 설명 |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` 또는 `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | 업로드된 음성 및 녹음의 로컬 디렉토리 |
| `STORAGE__S3_BUCKET` | — | S3 버킷 이름 (`STORAGE__BACKEND=s3` 시) |
| `STORAGE__S3_PREFIX` | `echoic/` | S3 키 접두사 |

### LLM (선택 사항)

"번역 및 분석" 기능에만 필요합니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `LLM__BACKEND` | — | `openai` 또는 `ollama` — 미설정 시 비활성화 |
| `LLM__OPENAI__API_KEY` | — | OpenAI API 키 |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | 모델 이름 |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | OpenAI 호환 엔드포인트 |
| `LLM__OLLAMA__BASE_URL` | `http://localhost:11434` | Ollama 서버 URL |
| `LLM__OLLAMA__MODEL` | `llama3` | Ollama 모델 이름 |
| `LLM__OLLAMA__NUM_CTX` | `512` | 컨텍스트 크기 (문장 분석에는 512로 충분) |
| `LLM__OLLAMA__THINK` | `false` | 사고 모드 활성화 (qwen3 등) |

---

## 개발

```bash
# 터미널 1 — 데이터베이스 (포트 5433)
docker compose up db

# 터미널 2 — 백엔드 (핫 리로드)
make dev-backend

# 터미널 3 — 프론트엔드 (HMR)
make dev-frontend
```

**http://localhost:5173**을 엽니다. 개발 서버는 `/api`를 8000 포트의 백엔드로 프록시합니다.

---

## 키보드 단축키

연습 페이지에서 사용 가능：

| 키 | 동작 |
|---|---|
| `Space` | 원본 음성 재생 / 일시정지 |
| `R` | 녹음 시작 / 종료 |
| `Enter` | 채점을 위해 제출 |
| `← →` | 이전 / 다음 문장 |
| `Esc` | 녹음 취소 |

---

## 데이터 백업

모든 데이터는 두 곳에 저장됩니다：

- **데이터베이스**：Docker Volume `postgres_data`（연습 기록, 점수, 문장 상태）
- **음성 파일**：Docker Volume `storage`（업로드된 음성 및 녹음）

마이그레이션 또는 백업 시 두 Volume을 모두 복사하세요.

---

## 라이선스

[MIT](./LICENSE)
