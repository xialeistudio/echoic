import httpx

from app.config import OpenAIConfig
from app.services.llm.base import LLMService

REPLY_LANG_NAMES = {
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "de": "German",
}

SOURCE_LANG_NAMES = {
    "en": "English",
    "fr": "French",
    "de": "German",
    "ja": "Japanese",
}


class OpenAILLMService(LLMService):
    def __init__(self, config: OpenAIConfig):
        self.config = config

    def _chat(self, messages: list[dict]) -> str:
        resp = httpx.post(
            f"{self.config.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.config.api_key}"},
            json={"model": self.config.model, "messages": messages},
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()

    def analyze(self, text: str, reply_lang: str = "zh-CN", source_lang: str = "en") -> str:
        reply = REPLY_LANG_NAMES.get(reply_lang, reply_lang)
        source = SOURCE_LANG_NAMES.get(source_lang, source_lang)
        system = (
            f"You are a language teacher specializing in {source}. "
            f"Analyze the {source} sentence the user provides. "
            f"Reply entirely in {reply}, including the section headings. "
            f"Output ONLY three markdown sections (## heading), covering: sentence structure, grammar points, key vocabulary. "
            f"No text outside the three sections."
        )
        return self._chat([
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ])
