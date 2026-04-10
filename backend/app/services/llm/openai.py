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
        return self._chat([
            {"role": "system", "content": f"You are an English teacher. Analyze the following English sentence. Cover: sentence structure, grammar points, and any difficult vocabulary. Be concise. Reply in {lang}. Do NOT add any trailing offers to help further or follow-up suggestions."},
            {"role": "user", "content": text},
        ])
