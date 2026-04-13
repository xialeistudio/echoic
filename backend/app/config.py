from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


# ── ASR ──────────────────────────────────────────────────────────────────────

class WhisperXConfig(BaseModel):
    model_size: str = "base"        # tiny / base / small / medium / large-v2
    device: str = "cpu"             # cpu / cuda
    compute_type: str = "int8"      # int8 / float16 / float32
    language: str = "en"
    batch_size: int = 16


class ASRConfig(BaseModel):
    backend: str = "whisperx"       # whisperx | (future: assemblyai, deepgram …)
    whisperx: WhisperXConfig = WhisperXConfig()


# ── Alignment ─────────────────────────────────────────────────────────────────

class Wav2Vec2AlignmentConfig(BaseModel):
    model_id: str = "facebook/wav2vec2-base-960h"
    device: str = "cpu"


class AlignmentConfig(BaseModel):
    backend: str = "wav2vec2"       # wav2vec2 | (future: mfa …)
    wav2vec2: Wav2Vec2AlignmentConfig = Wav2Vec2AlignmentConfig()


# ── Scoring ───────────────────────────────────────────────────────────────────

class PhonemeScoringConfig(BaseModel):
    # wav2vec2 model for phoneme recognition
    phoneme_model_id: str = "facebook/wav2vec2-lv-60-espeak-cv-ft"
    device: str = "cpu"
    # weights for the three dimensions
    accuracy_weight: float = 0.5
    fluency_weight: float = 0.3
    completeness_weight: float = 0.2


class ScoringConfig(BaseModel):
    backend: str = "phoneme"        # phoneme | (future: speechbrain …)
    phoneme: PhonemeScoringConfig = PhonemeScoringConfig()


# ── yt-dlp ───────────────────────────────────────────────────────────────────

class YtDlpConfig(BaseModel):
    cookies_from_browser: str = ""  # chrome | firefox | safari | edge — leave empty to skip


# ── LLM ──────────────────────────────────────────────────────────────────────

class OpenAIConfig(BaseModel):
    api_key: str = ""
    model: str = "gpt-4o-mini"
    base_url: str = "https://api.openai.com/v1"


class OllamaConfig(BaseModel):
    base_url: str = "http://localhost:11434"
    model: str = "llama3"
    num_ctx: int = 512          # context window; increase to 4096+ if think=True
    think: bool = False         # enable qwen3.5 thinking mode (slower, higher quality)


class LLMConfig(BaseModel):
    backend: str = "openai"
    openai: OpenAIConfig = OpenAIConfig()
    ollama: OllamaConfig = OllamaConfig()


# ── Storage ───────────────────────────────────────────────────────────────────

class StorageConfig(BaseModel):
    backend: str = "local"          # local | (future: s3 …)
    local_dir: str = "storage"
    # S3 config placeholder
    s3_bucket: str = ""
    s3_prefix: str = "echoic/"


# ── Top-level settings ────────────────────────────────────────────────────────

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",  # e.g. ASR__BACKEND=whisperx
    )

    database_url: str = "postgresql://echoic:echoic@localhost:5432/echoic"
    cors_origins: list[str] = ["http://localhost:5173"]

    asr: ASRConfig = ASRConfig()
    alignment: AlignmentConfig = AlignmentConfig()
    scoring: ScoringConfig = ScoringConfig()
    storage: StorageConfig = StorageConfig()
    llm: LLMConfig = LLMConfig()
    ytdlp: YtDlpConfig = YtDlpConfig()


settings = Settings()
