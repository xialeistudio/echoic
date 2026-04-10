from abc import ABC, abstractmethod
from pydantic import BaseModel
from app.schemas.audio import WordTimestamp
from app.schemas.practice import WordScore


class ScoringResult(BaseModel):
    accuracy_score: float       # 0–100, phoneme-level correctness
    fluency_score: float        # 0–100, pauses + speaking rate
    completeness_score: float   # 0–100, fraction of words covered
    word_scores: list[WordScore]


class ScoringService(ABC):
    @abstractmethod
    def phonemize_words(self, words: list[str]) -> list[str]:
        """Return IPA phoneme strings for each word."""

    @abstractmethod
    def score(
        self,
        recording_path: str,
        reference_text: str,
        aligned_words: list[WordTimestamp],
    ) -> ScoringResult:
        """
        Score a user recording against the reference sentence.

        Args:
            recording_path:  absolute path to user's recording
            reference_text:  the sentence the user was supposed to say
            aligned_words:   output of AlignmentService.align()

        Returns:
            ScoringResult with three dimension scores and per-word scores
        """
