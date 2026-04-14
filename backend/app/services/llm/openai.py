import json

import httpx

from app.config import OpenAIConfig
from app.services.llm.base import LLMService

LANG_NAMES = {
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "en": "English",
}


class OpenAILLMService(LLMService):
    def __init__(self, config: OpenAIConfig):
        self.config = config

    def _chat(self, messages: list[dict]) -> str:
        parts = []
        with httpx.stream(
            "POST",
            f"{self.config.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.config.api_key}"},
            json={"model": self.config.model, "messages": messages, "stream": True},
            timeout=60.0,
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    break
                chunk = json.loads(payload)
                delta = chunk["choices"][0]["delta"]
                if text := delta.get("content"):
                    parts.append(text)
        return "".join(parts).strip()

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
