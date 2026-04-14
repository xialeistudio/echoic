import json

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
            f"Reply in {lang}. "
            f"Output ONLY the following three markdown sections, no extra text before or after:\n\n"
            f"## Structure\n"
            f"One or two sentences describing the sentence type and grammatical structure.\n\n"
            f"## Grammar\n"
            f"Key grammar points (tense, voice, clause type, etc.).\n\n"
            f"## Vocabulary\n"
            f"Important or difficult words with their meaning in context."
        )
        return self._chat([
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ])
