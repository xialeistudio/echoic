# Echoic

**AI を活用したスピーキング練習ツール。** 任意の音声をインポートし、文ごとに練習して、即時の音素レベル発音スコアリングを取得できます。

[English](./README.md) · [简体中文](./README_CN.md) · [繁體中文](./README_TW.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md)

---

![Echoic デモ](./demo.gif)

---

## 機能

- **コンテンツギャラリー** — VOA Learning English・BBC Learning English の厳選エピソードを閲覧・インポート
- **音声インポート** — ローカルファイルのアップロード、または直接 URL からインポート
- **コレクション** — 音声をコレクションに整理
- **文ごとの練習** — 0.5×〜2× の再生速度調整で文ごとに練習
- **発音スコアリング** — 正確さ・流暢さ・完全性の 3 軸スコア、単語レベルの詳細付き
- **音素表示** — 単語ごとに IPA 表記を表示；採点後は音素がスコアで色分け
- **単語復習** — 全セッションの単語正確度を集計し、弱点を特定
- **A/B 比較** — ワンクリックでオリジナルと録音を連続再生
- **AI 文章分析** — OpenAI またはローカル Ollama による翻訳・文法解析（任意）
- **練習履歴** — 全ての試行をスコア付きで保存；履歴クリックで録音を再生
- **文の状態** — 文をブックマークして復習；習得済みとしてマークして非表示に
- **文の検索** — 任意の音声内でテキストで文を検索
- **練習ヒートマップ** — 365 日の活動カレンダー
- **キーボードショートカット** — Space / R / Enter / ←→ / Esc でハンズフリー操作
- **ダークモード** — ライト・ダーク・システム連動の 3 種
- **多言語学習** — 英語・フランス語・ドイツ語を練習；音素スコアリングが言語に自動対応
- **多言語 UI** — 日本語、英語、簡体字中国語、繁体字中国語、韓国語、フランス語、ドイツ語

## 対応学習言語

| 言語 | `ASR__WHISPERX__LANGUAGE` | `ALIGNMENT__WAV2VEC2__LANGUAGE` | `SCORING__PHONEME__LANGUAGE` |
|---|---|---|---|
| 英語 | `en` | `en` | `en-us` |
| フランス語 | `fr` | `fr` | `fr-fr` |
| ドイツ語 | `de` | `de` | `de` |
| 日本語 | `ja` | `ja` | `ja` |

> 音素スコアリングモデルは全言語共通 [`facebook/wav2vec2-lv-60-espeak-cv-ft`](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft)。アライメントモデルは whisperx が初回使用時に自動ダウンロードします。

学習言語を切り替えるには `.env` で 3 つの変数を設定します：

```env
ASR__WHISPERX__LANGUAGE=fr
ALIGNMENT__WAV2VEC2__LANGUAGE=fr
SCORING__PHONEME__LANGUAGE=fr-fr
```

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 18、Vite、Tailwind CSS v4、shadcn/ui、WaveSurfer.js |
| バックエンド | FastAPI、SQLAlchemy、Alembic |
| データベース | PostgreSQL 16 |
| ASR | WhisperX（faster-whisper + CTranslate2） |
| アライメント | wav2vec2 |
| スコアリング | wav2vec2 + phonemizer |
| LLM | OpenAI API / Ollama（任意） |

## クイックスタート（Docker）

最も簡単な起動方法です。[Docker](https://docs.docker.com/get-docker/) のみ必要です。

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
docker compose up
```

ブラウザで **http://localhost:8000** を開きます。

> **初回起動時：** ASR とアライメントモデル（約 1 GB）は初回使用時に自動ダウンロードされ Docker Volume にキャッシュされます。次回以降の起動は即時です。

### AI 文章分析を有効にする（任意）

`docker compose up` の前にプロジェクトルートに `.env` ファイルを作成します。

**OpenAI：**
```env
LLM__BACKEND=openai
LLM__OPENAI__API_KEY=sk-...
LLM__OPENAI__MODEL=gpt-4o-mini
# OpenAI 互換エンドポイントをサポート：
# LLM__OPENAI__BASE_URL=https://api.openai.com/v1
```

**Ollama（ローカル、API キー不要）：**

[Ollama](https://ollama.com) をインストールしてモデルを取得：
```bash
ollama pull qwen2.5:3b
```

`.env` を作成：
```env
LLM__BACKEND=ollama
LLM__OLLAMA__BASE_URL=http://host.docker.internal:11434
LLM__OLLAMA__MODEL=qwen2.5:3b
LLM__OLLAMA__NUM_CTX=512
```

> `host.docker.internal` でコンテナからホストの Ollama にアクセスできます。Linux ではホスト IP に置き換えてください。

---

## 手動セットアップ

### 必要環境

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

### 手順

```bash
# 1. クローン
git clone https://github.com/xialeistudio/echoic.git
cd echoic

# 2. PostgreSQL 起動
make db                          # Docker でポート 5433 に起動

# 3. バックエンド
cd backend
uv sync
cp .env.example .env             # 必要に応じて編集
uv run alembic upgrade head
cd .. && make run                # http://localhost:8000 で起動

# 4. フロントエンド（開発時のみ）
make dev-frontend                # http://localhost:5173
```

**本番環境**ではフロントエンドをビルドしてバックエンドにバンドルします：

```bash
make build   # backend/static/ に出力
make run     # API + フロントエンドを http://localhost:8000 で提供
```

---

## 環境変数

`backend/.env.example` を `backend/.env` にコピーします。`DATABASE_URL` 以外は任意です。

### コア

| 変数 | デフォルト | 説明 |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5433/echoic` | PostgreSQL 接続文字列 |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 許可する CORS オリジン（JSON 配列） |

### ASR

> WhisperX は CTranslate2 を使用しており、MPS（Apple Silicon GPU）は**非対応**です。macOS では `cpu` を使用してください。

| 変数 | デフォルト | 説明 |
|---|---|---|
| `ASR__WHISPERX__MODEL_SIZE` | `base` | `tiny` · `base` · `small` · `medium` · `large-v2` — 大きいほど精度高・低速 |
| `ASR__WHISPERX__DEVICE` | `cpu` | `cpu` または `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | `int8` · `float16` · `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | 転写対象言語コード |

### アライメント・スコアリング

> PyTorch を使用 — Apple Silicon の MPS は**対応**しています。

| 変数 | デフォルト | 説明 |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `ALIGNMENT__WAV2VEC2__LANGUAGE` | `en` | 言語コード — `ASR__WHISPERX__LANGUAGE` と一致させること |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `SCORING__PHONEME__LANGUAGE` | `en-us` | espeak 言語コード（`en-us` · `fr-fr` · `de` · `ja` …） |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | 正確さの重み |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | 流暢さの重み |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | 完全性の重み |

### ストレージ

| 変数 | デフォルト | 説明 |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` または `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | アップロード音声と録音のローカルディレクトリ |
| `STORAGE__S3_BUCKET` | — | S3 バケット名（`STORAGE__BACKEND=s3` 時） |
| `STORAGE__S3_PREFIX` | `echoic/` | S3 キープレフィックス |

### LLM（任意）

「翻訳と分析」機能にのみ必要です。

| 変数 | デフォルト | 説明 |
|---|---|---|
| `LLM__BACKEND` | — | `openai` または `ollama` — 未設定で無効化 |
| `LLM__OPENAI__API_KEY` | — | OpenAI API キー |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | モデル名 |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | OpenAI 互換エンドポイント |
| `LLM__OLLAMA__BASE_URL` | `http://localhost:11434` | Ollama サーバー URL |
| `LLM__OLLAMA__MODEL` | `llama3` | Ollama モデル名 |
| `LLM__OLLAMA__NUM_CTX` | `512` | コンテキストサイズ（文章分析には 512 で十分） |
| `LLM__OLLAMA__THINK` | `false` | 思考モードを有効化（qwen3 など） |

---

## 開発

```bash
# ターミナル 1 — データベース（ポート 5433）
docker compose up db

# ターミナル 2 — バックエンド（ホットリロード）
make dev-backend

# ターミナル 3 — フロントエンド（HMR）
make dev-frontend
```

**http://localhost:5173** を開きます。開発サーバーは `/api` をポート 8000 のバックエンドにプロキシします。

---

## キーボードショートカット

練習ページで使用可能：

| キー | 操作 |
|---|---|
| `Space` | オリジナル音声の再生 / 一時停止 |
| `R` | 録音の開始 / 終了 |
| `Enter` | 採点のために提出 |
| `← →` | 前 / 次の文 |
| `Esc` | 録音をキャンセル |

---

## データバックアップ

すべてのデータは 2 か所に保存されます：

- **データベース**：Docker Volume `postgres_data`（練習記録、スコア、文の状態）
- **音声ファイル**：Docker Volume `storage`（アップロード音声と録音）

移行またはバックアップ時は、両方の Volume をコピーしてください。

---

## ライセンス

[MIT](./LICENSE)
