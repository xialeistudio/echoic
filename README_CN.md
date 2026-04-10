# Echoic

**AI 驱动的英语发音练习工具。** 导入任意音频，逐句练习，即时获得音素级评分。

[English](./README.md)

---

## 功能特性

- **音频导入** — 上传文件或从 URL 导入
- **逐句练习** — 支持调速播放，逐句跟读
- **发音评分** — 实时返回准确度、流利度、完整度三项评分
- **音素展示** — 每个单词显示 IPA 国际音标
- **AI 句子分析** — 基于 OpenAI 的翻译与语法解析（可选）
- **练习历史** — 记录每次练习的评分详情
- **练习热力图** — 365 天练习活跃度可视化
- **句子收藏** — 标记重点句子，专项练习

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18、Vite、Tailwind CSS、shadcn/ui、WaveSurfer.js |
| 后端 | FastAPI、SQLAlchemy、Alembic |
| 语音识别 | WhisperX（faster-whisper + CTranslate2） |
| 语音对齐 | wav2vec2 |
| 发音评分 | wav2vec2 + phonemizer |
| 数据库 | PostgreSQL 16 |

## 环境依赖

- Python 3.11+
- Node.js 20+ 及 pnpm
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

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
```

### 2. 启动数据库

```bash
# 通过 Docker 启动 PostgreSQL（也可使用本地已有实例）
make db
```

### 3. 启动后端

```bash
cd backend

# 安装依赖
uv sync

# 复制并编辑环境变量
cp .env.example .env

# 执行数据库迁移
uv run alembic upgrade head

# 启动服务
cd .. && make run
```

### 4. 启动前端（仅开发环境）

新开一个终端：

```bash
make dev-frontend
```

生产环境请先构建前端（产物输出到 `backend/static`）：

```bash
make build
```

然后执行 `make run`，API 与前端统一由 `http://localhost:8000` 提供服务。

## 环境变量

将 `backend/.env.example` 复制为 `backend/.env` 并按需修改。

### 核心配置

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5432/echoic` | PostgreSQL 连接字符串 |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 允许的 CORS 来源（JSON 数组） |

### 语音识别（ASR）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ASR__BACKEND` | `whisperx` | ASR 后端 |
| `ASR__WHISPERX__MODEL_SIZE` | `base` | 模型大小：`tiny` `base` `small` `medium` `large-v2` |
| `ASR__WHISPERX__DEVICE` | `cpu` | 推理设备：`cpu` 或 `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | 计算精度：`int8` `float16` `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | 目标语言代码 |

### 对齐与评分

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` `cuda` `mps`（Apple Silicon） |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` `cuda` `mps` |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | 准确度权重 |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | 流利度权重 |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | 完整度权重 |

### 存储

| 变量 | 默认值 | 说明 |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` 或 `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | 本地存储目录 |
| `STORAGE__S3_BUCKET` | — | S3 存储桶名称 |
| `STORAGE__S3_PREFIX` | `echoic/` | S3 键前缀 |

### LLM（可选）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `LLM__OPENAI__API_KEY` | — | OpenAI API Key（句子分析功能必填） |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | 使用的模型 |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | API 地址（可替换为代理） |

## 开发模式

```bash
# 后端（热重载）
make dev-backend

# 前端（HMR）
make dev-frontend
```

前端开发服务器会自动将 `/api` 请求代理到 `http://localhost:8000`。

## 许可证

[MIT](./LICENSE)
