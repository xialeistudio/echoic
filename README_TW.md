# Echoic

**AI 驅動的口語練習工具。** 匯入任意音訊，逐句跟讀，即時獲得音素級發音評分。

[English](./README.md) · [简体中文](./README_CN.md) · [繁體中文](./README_TW.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md)

---

![Echoic 演示](./demo.gif)

---

## 功能特色

- **內容廣場** — 瀏覽並匯入 VOA Learning English、BBC Learning English 精選節目
- **音訊匯入** — 上傳本地檔案或從任意直鏈 URL 匯入
- **合集管理** — 將音訊整理到自訂合集
- **逐句練習** — 支援 0.5×–2× 調速播放，逐句跟讀
- **發音評分** — 準確度、流利度、完整度三維評分，附單字級拆解
- **音素展示** — 每個單字顯示 IPA 國際音標；評分後音素按得分著色
- **單字復盤** — 彙總所有練習中的單字準確度，快速定位弱點
- **原聲/錄音 A/B 對比** — 一鍵連續播放原聲與錄音，直觀感受差距
- **AI 句子分析** — 基於 OpenAI 或本地 Ollama 的翻譯與語法解析（可選）
- **練習歷史** — 每次練習完整存檔；點擊歷史記錄可重播對應錄音
- **句子狀態** — 收藏句子用於重點複習；標記已掌握以隱藏完成的句子
- **句子搜尋** — 在任意音訊內按文字篩選句子
- **練習熱力圖** — 365 天練習活躍度日曆
- **鍵盤快捷鍵** — 空白鍵 / R / 回車 / ←→ / Esc 全程鍵盤操作
- **深色模式** — 淺色、深色、跟隨系統三選一
- **多語種練習** — 支援英語、法語、德語學習；發音評分按語言自動適配
- **多語言介面** — 繁體中文、簡體中文、英文、日語、韓語、法語、德語

## 支援的練習語言

| 語言 | `ASR__WHISPERX__LANGUAGE` | `ALIGNMENT__WAV2VEC2__LANGUAGE` | `SCORING__PHONEME__LANGUAGE` |
|---|---|---|---|
| 英語 | `en` | `en` | `en-us` |
| 法語 | `fr` | `fr` | `fr-fr` |
| 德語 | `de` | `de` | `de` |

> 音素評分模型所有語言共用 [`facebook/wav2vec2-lv-60-espeak-cv-ft`](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft)。對齊模型由 whisperx 在首次使用時自動下載。

切換練習語言只需在 `.env` 中設定三個變數：

```env
ASR__WHISPERX__LANGUAGE=fr
ALIGNMENT__WAV2VEC2__LANGUAGE=fr
SCORING__PHONEME__LANGUAGE=fr-fr
```

## 技術堆疊

| 層級 | 技術 |
|---|---|
| 前端 | React 18、Vite、Tailwind CSS v4、shadcn/ui、WaveSurfer.js |
| 後端 | FastAPI、SQLAlchemy、Alembic |
| 資料庫 | PostgreSQL 16 |
| 語音識別 | WhisperX（faster-whisper + CTranslate2） |
| 語音對齊 | wav2vec2 |
| 發音評分 | wav2vec2 + phonemizer |
| LLM | OpenAI API / Ollama（可選） |

## 快速開始（Docker）

最簡單的啟動方式，只需安裝 [Docker](https://docs.docker.com/get-docker/)。

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
docker compose up
```

瀏覽器開啟 **http://localhost:8000**。

> **首次啟動**：ASR 和對齊模型（約 1 GB）會在首次使用時自動下載並快取到 Docker Volume，後續啟動無需重新下載。

### 啟用 AI 句子分析（可選）

在專案根目錄建立 `.env` 檔案，再執行 `docker compose up`。

**OpenAI：**
```env
LLM__BACKEND=openai
LLM__OPENAI__API_KEY=sk-...
LLM__OPENAI__MODEL=gpt-4o-mini
# 支援任何 OpenAI 相容介面：
# LLM__OPENAI__BASE_URL=https://api.openai.com/v1
```

**Ollama（本地推理，無需 API Key）：**

先安裝 [Ollama](https://ollama.com) 並拉取模型：
```bash
ollama pull qwen2.5:3b
```

然後建立 `.env`：
```env
LLM__BACKEND=ollama
LLM__OLLAMA__BASE_URL=http://host.docker.internal:11434
LLM__OLLAMA__MODEL=qwen2.5:3b
LLM__OLLAMA__NUM_CTX=512
```

> `host.docker.internal` 用於容器內存取宿主機上的 Ollama。Linux 系統請替換為宿主機 IP。

---

## 手動部署

### 依賴環境

- Python 3.11+、[uv](https://docs.astral.sh/uv/)
- Node.js 20+、[pnpm](https://pnpm.io)
- PostgreSQL 16
- ffmpeg
- espeak-ng

**macOS（Homebrew）：**
```bash
brew install ffmpeg espeak-ng postgresql@16
```

**Ubuntu / Debian：**
```bash
sudo apt install ffmpeg espeak-ng postgresql
```

### 啟動步驟

```bash
# 1. 克隆倉庫
git clone https://github.com/xialeistudio/echoic.git
cd echoic

# 2. 啟動 PostgreSQL
make db                          # 透過 Docker 在 5433 埠啟動

# 3. 後端
cd backend
uv sync
cp .env.example .env             # 按需編輯
uv run alembic upgrade head
cd .. && make run                # 服務啟動於 http://localhost:8000

# 4. 前端（僅開發環境）
make dev-frontend                # http://localhost:5173
```

**正式部署**時先建置前端，產物會打包進後端：

```bash
make build   # 輸出到 backend/static/
make run     # API + 前端統一由 http://localhost:8000 提供服務
```

---

## 環境變數

將 `backend/.env.example` 複製為 `backend/.env`。除 `DATABASE_URL` 外均為可選項。

### 核心

| 變數 | 預設值 | 說明 |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5433/echoic` | PostgreSQL 連線字串 |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 允許的 CORS 來源（JSON 陣列） |

### 語音識別（ASR）

> WhisperX 使用 CTranslate2，**不支援** MPS（Apple Silicon GPU）。macOS 請使用 `cpu`。

| 變數 | 預設值 | 說明 |
|---|---|---|
| `ASR__WHISPERX__MODEL_SIZE` | `base` | `tiny` · `base` · `small` · `medium` · `large-v2`，越大越準但越慢 |
| `ASR__WHISPERX__DEVICE` | `cpu` | `cpu` 或 `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | `int8` · `float16` · `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | 轉錄目標語言代碼 |

### 對齊與評分

> 使用 PyTorch，Apple Silicon 的 MPS **受支援**。

| 變數 | 預設值 | 說明 |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `ALIGNMENT__WAV2VEC2__LANGUAGE` | `en` | 語言代碼，須與 `ASR__WHISPERX__LANGUAGE` 保持一致 |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `SCORING__PHONEME__LANGUAGE` | `en-us` | espeak 語言代碼（`en-us` · `fr-fr` · `de` · `ja` …） |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | 準確度在綜合評分中的權重 |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | 流利度權重 |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | 完整度權重 |

### 儲存

| 變數 | 預設值 | 說明 |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` 或 `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | 音訊和錄音的本地儲存目錄 |
| `STORAGE__S3_BUCKET` | — | S3 儲存桶名稱（`STORAGE__BACKEND=s3` 時使用） |
| `STORAGE__S3_PREFIX` | `echoic/` | S3 鍵前綴 |

### LLM（可選）

僅「翻譯與分析」功能需要。

| 變數 | 預設值 | 說明 |
|---|---|---|
| `LLM__BACKEND` | — | `openai` 或 `ollama`，留空則停用分析功能 |
| `LLM__OPENAI__API_KEY` | — | OpenAI API Key |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | 模型名稱 |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | 支援任何 OpenAI 相容介面 |
| `LLM__OLLAMA__BASE_URL` | `http://localhost:11434` | Ollama 服務位址 |
| `LLM__OLLAMA__MODEL` | `llama3` | Ollama 模型名稱 |
| `LLM__OLLAMA__NUM_CTX` | `512` | 上下文長度（句子分析 512 已足夠） |
| `LLM__OLLAMA__THINK` | `false` | 開啟思考模式（如 qwen3 系列） |

---

## 開發模式

```bash
# 終端 1 — 資料庫（5433 埠，避免與本地 postgres 衝突）
docker compose up db

# 終端 2 — 後端熱重載
make dev-backend

# 終端 3 — 前端 HMR
make dev-frontend
```

開啟 **http://localhost:5173**，前端開發伺服器會自動將 `/api` 請求代理到後端的 8000 埠。

---

## 鍵盤快捷鍵

練習頁面可用：

| 按鍵 | 操作 |
|---|---|
| `Space` | 播放 / 暫停原聲 |
| `R` | 開始 / 完成錄音 |
| `Enter` | 提交發音評估 |
| `← →` | 上一句 / 下一句 |
| `Esc` | 取消錄音 |

---

## 資料備份

所有資料存放在兩個地方：

- **資料庫**：Docker Volume `postgres_data`（練習記錄、評分、句子狀態）
- **音訊檔案**：Docker Volume `storage`（上傳的音訊和錄音）

遷移或備份時複製這兩個 Volume 即可。

---

## 授權

[MIT](./LICENSE)
