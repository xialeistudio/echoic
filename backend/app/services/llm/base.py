from abc import ABC, abstractmethod


class LLMService(ABC):
    @abstractmethod
    def analyze(self, text: str, reply_lang: str = "zh-CN") -> str:
        """Analyze sentence structure, grammar, and vocabulary."""
