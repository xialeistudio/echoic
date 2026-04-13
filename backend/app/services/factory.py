from functools import lru_cache
from app.config import settings
from app.services.asr.base import ASRService
from app.services.alignment.base import AlignmentService
from app.services.llm.base import LLMService
from app.services.scoring.base import ScoringService
from app.services.storage.base import StorageService


@lru_cache
def get_asr_service() -> ASRService:
    match settings.asr.backend:
        case "whisperx":
            from app.services.asr.whisperx import WhisperXASRService
            return WhisperXASRService(settings.asr.whisperx)
        case _:
            raise ValueError(f"Unknown ASR backend: {settings.asr.backend}")


@lru_cache
def get_alignment_service() -> AlignmentService:
    match settings.alignment.backend:
        case "wav2vec2":
            from app.services.alignment.wav2vec2 import Wav2Vec2AlignmentService
            return Wav2Vec2AlignmentService(settings.alignment.wav2vec2)
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
