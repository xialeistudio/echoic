from abc import ABC, abstractmethod
from app.schemas.audio import Sentence


class ASRService(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str) -> list[Sentence]:
        """
        Transcribe audio file and return sentences with word-level timestamps.

        Args:
            audio_path: absolute path to audio file

        Returns:
            List of Sentence, each containing word-level timestamps
        """
