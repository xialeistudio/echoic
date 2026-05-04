from functools import lru_cache
from app.config import settings
from app.services.asr.base import ASRService
from app.services.alignment.base import AlignmentService
from app.services.llm.base import LLMService
from app.services.scoring.base import ScoringService
from app.services.storage.base import StorageService


@lru_cache(maxsize=None)
def get_asr_service(language: str | None = None) -> ASRService:
    match settings.asr.backend:
        case "whisperx":
            from app.services.asr.whisperx import WhisperXASRService
            from app.config import WhisperXConfig
            if language is None or language == settings.asr.whisperx.language:
                return WhisperXASRService(settings.asr.whisperx)
            config = WhisperXConfig(
                model_size=settings.asr.whisperx.model_size,
                device=settings.asr.whisperx.device,
                compute_type=settings.asr.whisperx.compute_type,
                language=language,
                batch_size=settings.asr.whisperx.batch_size,
            )
            return WhisperXASRService(config)
        case _:
            raise ValueError(f"Unknown ASR backend: {settings.asr.backend}")


@lru_cache(maxsize=None)
def get_alignment_service(language: str | None = None) -> AlignmentService:
    match settings.alignment.backend:
        case "wav2vec2":
            from app.services.alignment.wav2vec2 import Wav2Vec2AlignmentService
            from app.config import Wav2Vec2AlignmentConfig
            if language is None or language == settings.alignment.wav2vec2.language:
                return Wav2Vec2AlignmentService(settings.alignment.wav2vec2)
            config = Wav2Vec2AlignmentConfig(
                model_id=settings.alignment.wav2vec2.model_id,
                device=settings.alignment.wav2vec2.device,
                language=language,
            )
            return Wav2Vec2AlignmentService(config)
        case _:
            raise ValueError(f"Unknown alignment backend: {settings.alignment.backend}")


@lru_cache
def get_scoring_service() -> ScoringService:
    match settings.scoring.backend:
        case "phoneme":
            from app.services.scoring.phoneme import PhonemeScoringService
            return PhonemeScoringService(settings.scoring.phoneme)
        case _:
            raise ValueError(f"Unknown scoring backend: {settings.scoring.backend}")


@lru_cache
def get_llm_service() -> LLMService:
    match settings.llm.backend:
        case "openai":
            from app.services.llm.openai import OpenAILLMService
            return OpenAILLMService(settings.llm.openai)
        case "ollama":
            from app.services.llm.ollama import OllamaLLMService
            return OllamaLLMService(settings.llm.ollama)
        case _:
            raise ValueError(f"Unknown LLM backend: {settings.llm.backend}")


@lru_cache
def get_storage_service(backend: str = "") -> StorageService:
    """
    Returns StorageService for the given backend name.
    Defaults to the configured active backend (used when saving new files).
    Pass record.storage_backend when reading/deleting existing files.
    """
    target = backend or settings.storage.backend
    match target:
        case "local":
            from app.services.storage.local import LocalStorageService
            return LocalStorageService(settings.storage)
        case _:
            raise ValueError(f"Unknown storage backend: {target}")
