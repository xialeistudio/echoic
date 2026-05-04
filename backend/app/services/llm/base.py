from abc import ABC, abstractmethod


class LLMService(ABC):
    @abstractmethod
    def analyze(self, text: str, reply_lang: str = "zh-CN", source_lang: str = "en") -> str:
        """Analyze sentence structure, grammar, and vocabulary."""

    @abstractmethod
    def generate_question(
        self,
        question_type: str,
        language: str,
        difficulty: str = "intermediate",
        topic: str | None = None,
    ) -> dict:
        """
        Generate an oral practice question.
        Returns {"prompt": str, "reference_text": str | None}
        """

    @abstractmethod
    def score_oral_response(
        self,
        question_type: str,
        prompt: str,
        transcription: str,
        context: str | None = None,
        reply_lang: str = "zh-CN",
    ) -> dict:
        """
        Score a free-form oral response.
        Returns {"score": int 0-100, "feedback": str, "highlights": list[str]}
        """
