from abc import ABC, abstractmethod
from app.schemas.audio import WordTimestamp


class AlignmentService(ABC):
    @abstractmethod
    def align(self, audio_path: str, reference_text: str) -> list[WordTimestamp]:
        """
        Force-align user recording against reference text.

        Args:
            audio_path:      absolute path to user's recording
            reference_text:  the sentence the user was supposed to say

        Returns:
            List of WordTimestamp — words successfully aligned with time ranges.
            Words the user skipped or mispronounced badly may be absent.
        """
