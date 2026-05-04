# Echoic

**AI 驱动的口语练习工具。** 导入任意音频，逐句跟读，即时获得音素级发音评分。

[English](./README.md) · [简体中文](./README_CN.md) · [繁體中文](./README_TW.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md)

---

![Echoic 演示](./demo.gif)

---

## 功能特性

- **口语练习** — AI 驱动的口语训练，三种模式：
  - *朗读* — 朗读 AI 生成的段落，获得音素级准确度、流利度、完整度评分
  - *情景提问* — 针对 AI 生成的情景作答，LLM 评估内容、相关性和表达
  - *话题演讲* — 围绕给定话题自由表达约一分钟，LLM 评分并给出反馈
- **内容广场** — 浏览并导入 VOA Learning English、BBC Learning English 精选节目
- **音频导入** — 上传本地文件或从任意直链 URL 导入
- **合集管理** — 将音频整理到自定义合集
- **逐句练习** — 支持 0.5×–2× 调速播放，逐句跟读
- **发音评分** — 准确度、流利度、完整度三维评分，附单词级拆解
- **音素展示** — 每个单词显示 IPA 国际音标；评分后音素按得分着色
- **单词复盘** — 汇总所有练习中的单词准确度，快速定位弱点
- **原声/录音 A/B 对比** — 一键连续播放原声与录音，直观感受差距
- **AI 句子分析** — 基于 OpenAI 或本地 Ollama 的翻译与语法解析（可选）
- **练习历史** — 每次练习完整存档；点击历史记录可重播对应录音
- **句子状态** — 收藏句子用于重点复习；标记已掌握以隐藏完成的句子
- **句子搜索** — 在任意音频内按文本筛选句子
- **练习热力图** — 365 天练习活跃度日历
- **键盘快捷键** — 空格 / R / 回车 / ←→ / Esc 全程键盘操作
- **深色模式** — 浅色、深色、跟随系统三选一
- **多语种练习** — 支持英语、日语、韩语、法语、德语、西班牙语、意大利语、葡萄牙语、俄语；发音评分按语言自动适配
- **多语言界面** — 简体中文、繁体中文、英文、日语、韩语、法语、德语

## 支持的练习语言

### 逐句练习（音频库）

在 `.env` 中配置一种主语言：

| 语言 | `ASR__WHISPERX__LANGUAGE` | `ALIGNMENT__WAV2VEC2__LANGUAGE` | `SCORING__PHONEME__LANGUAGE` |
|---|---|---|---|
| 英语 | `en` | `en` | `en-us` |
| 法语 | `fr` | `fr` | `fr-fr` |
| 德语 | `de` | `de` | `de` |
| 日语 | `ja` | `ja` | `ja` |

### 口语练习

语言在 UI 中**按会话选择**，无需修改 `.env`。支持：英语、日语、韩语、法语、德语、西班牙语、意大利语、葡萄牙语、俄语。

各语言的 ASR 和对齐模型在首次使用时自动下载（约 400 MB），永久缓存。

> 音素评分所有语言共用 [`facebook/wav2vec2-lv-60-espeak-cv-ft`](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft)。

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18、Vite、Tailwind CSS v4、shadcn/ui、WaveSurfer.js |
| 后端 | FastAPI、SQLAlchemy、Alembic |
| 数据库 | PostgreSQL 16 |
| 语音识别 | WhisperX（faster-whisper + CTranslate2） |
| 语音对齐 | wav2vec2 |
| 发音评分 | wav2vec2 + phonemizer |
| LLM | OpenAI API / Ollama（可选） |

## 快速开始（Docker）

最简单的启动方式，只需安装 [Docker](https://docs.docker.com/get-docker/)。

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
docker compose up
```

浏览器打开 **http://localhost:8000**。

> **首次启动**：ASR 和对齐模型（约 1 GB）会在首次使用时自动下载并缓存到 Docker Volume，后续启动无需重新下载。

### 启用 AI 句子分析（可选）

在项目根目录创建 `.env` 文件，再运行 `docker compose up`。

**OpenAI：**
```env
LLM__BACKEND=openai
LLM__OPENAI__API_KEY=sk-...
LLM__OPENAI__MODEL=gpt-4o-mini
# 支持任何 OpenAI 兼容接口：
# LLM__OPENAI__BASE_URL=https://api.openai.com/v1
```

**Ollama（本地推理，无需 API Key）：**

先安装 [Ollama](https://ollama.com) 并拉取模型：
```bash
ollama pull qwen2.5:3b
```

然后创建 `.env`：
```env
LLM__BACKEND=ollama
LLM__OLLAMA__BASE_URL=http://host.docker.internal:11434
LLM__OLLAMA__MODEL=qwen2.5:3b
LLM__OLLAMA__NUM_CTX=512
```

> `host.docker.internal` 用于容器内访问宿主机上的 Ollama。Linux 系统请替换为宿主机 IP。

---

## 手动部署

### 依赖环境

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

### 启动步骤

```bash
# 1. 克隆仓库
git clone https://github.com/xialeistudio/echoic.git
cd echoic

# 2. 启动 PostgreSQL
make db                          # 通过 Docker 在 5433 端口启动

# 3. 后端
cd backend
uv sync
cp .env.example .env             # 按需编辑
uv run alembic upgrade head
cd .. && make run                # 服务启动于 http://localhost:8000

# 4. 前端（仅开发环境）
make dev-frontend                # http://localhost:5173
```

**生产部署**时先构建前端，产物会打包进后端：

```bash
make build   # 输出到 backend/static/
make run     # API + 前端统一由 http://localhost:8000 提供服务
```

---

## 环境变量

将 `backend/.env.example` 复制为 `backend/.env`。除 `DATABASE_URL` 外均为可选项。

### 核心

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5433/echoic` | PostgreSQL 连接字符串 |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 允许的 CORS 来源（JSON 数组） |

### 语音识别（ASR）

> WhisperX 使用 CTranslate2，**不支持** MPS（Apple Silicon GPU）。macOS 请使用 `cpu`。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ASR__WHISPERX__MODEL_SIZE` | `base` | `tiny` · `base` · `small` · `medium` · `large-v2`，越大越准但越慢 |
| `ASR__WHISPERX__DEVICE` | `cpu` | `cpu` 或 `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | `int8` · `float16` · `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | 转录目标语言代码 |

### 对齐与评分

> 使用 PyTorch，Apple Silicon 的 MPS **受支持**。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `ALIGNMENT__WAV2VEC2__LANGUAGE` | `en` | 语言代码，须与 `ASR__WHISPERX__LANGUAGE` 保持一致 |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `SCORING__PHONEME__LANGUAGE` | `en-us` | espeak 语言代码（`en-us` · `fr-fr` · `de` · `ja` …） |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | 准确度在综合评分中的权重 |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | 流利度权重 |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | 完整度权重 |

### 存储

| 变量 | 默认值 | 说明 |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` 或 `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | 音频和录音的本地存储目录 |
| `STORAGE__S3_BUCKET` | — | S3 存储桶名称（`STORAGE__BACKEND=s3` 时使用） |
| `STORAGE__S3_PREFIX` | `echoic/` | S3 键前缀 |

### LLM（可选）

仅"翻译与分析"功能需要。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `LLM__BACKEND` | — | `openai` 或 `ollama`，留空则禁用分析功能 |
| `LLM__OPENAI__API_KEY` | — | OpenAI API Key |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | 模型名称 |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | 支持任何 OpenAI 兼容接口 |
| `LLM__OLLAMA__BASE_URL` | `http://localhost:11434` | Ollama 服务地址 |
| `LLM__OLLAMA__MODEL` | `llama3` | Ollama 模型名称 |
| `LLM__OLLAMA__NUM_CTX` | `512` | 上下文长度（句子分析 512 已足够） |
| `LLM__OLLAMA__THINK` | `false` | 开启思考模式（如 qwen3 系列） |

---

## 开发模式

```bash
# 终端 1 — 数据库（5433 端口，避免与本地 postgres 冲突）
docker compose up db

# 终端 2 — 后端热重载
make dev-backend

# 终端 3 — 前端 HMR
make dev-frontend
```

打开 **http://localhost:5173**，前端开发服务器会自动将 `/api` 请求代理到后端的 8000 端口。

---

## 键盘快捷键

练习页面可用：

| 按键 | 操作 |
|---|---|
| `Space` | 播放 / 暂停原声 |
| `R` | 开始 / 完成录音 |
| `Enter` | 提交发音评估 |
| `← →` | 上一句 / 下一句 |
| `Esc` | 取消录音 |

---

## 数据备份

所有数据存储在两个地方：

- **数据库**：Docker Volume `postgres_data`（练习记录、评分、句子状态）
- **音频文件**：Docker Volume `storage`（上传的音频和录音）

迁移或备份时复制这两个 Volume 即可。

---

## 数据备份

所有数据存储在两个地方：

- **数据库**：Docker Volume `postgres_data`（练习记录、评分、句子状态）
- **音频文件**：Docker Volume `storage`（上传的音频和录音）

迁移或备份时复制这两个 Volume 即可。

---

## 许可证

[MIT](./LICENSE)
