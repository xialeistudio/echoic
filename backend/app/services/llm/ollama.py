import httpx

from app.config import OllamaConfig
from app.services.llm.base import LLMService

LANG_NAMES = {
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "en": "English",
}


class OllamaLLMService(LLMService):
    def __init__(self, config: OllamaConfig):
        self.config = config

    def _chat(self, messages: list[dict]) -> str:
        resp = httpx.post(
            f"{self.config.base_url}/api/chat",
            json={
                "model": self.config.model,
                "messages": messages,
                "stream": False,
                "think": self.config.think,
                "options": {"num_ctx": self.config.num_ctx},
            },
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"].strip()

    def analyze(self, text: str, reply_lang: str = "zh-CN") -> str:
        lang = LANG_NAMES.get(reply_lang, reply_lang)
        system = (
            f"You are an English teacher. Analyze the English sentence the user provides. "
            f"Reply entirely in {lang}, including the section headings. "
            f"Output ONLY three markdown sections (## heading), covering: sentence structure, grammar points, key vocabulary. "
            f"No text outside the three sections."
        )
        return self._chat([
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ])
