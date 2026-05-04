import json
import httpx

from app.config import OllamaConfig
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

    def generate_question(
        self,
        question_type: str,
        language: str,
        difficulty: str = "intermediate",
        topic: str | None = None,
    ) -> dict:
        from app.services.llm.openai import OpenAILLMService
        topic_hint = f" The topic should relate to: {topic}." if topic else ""
        difficulty_map = {"beginner": "simple", "intermediate": "moderate", "advanced": "complex"}
        level = difficulty_map.get(difficulty, "moderate")
        system = (
            "You are an oral language exam question designer. "
            "Generate a single practice question for a language learner. "
            "Respond with ONLY valid JSON, no extra text: "
            '{"prompt": "<instruction shown to learner>", "reference_text": "<text or null>"}'
        )
        type_instructions = {
            "read_aloud": (
                f"Generate a {level}-level passage in {language} for the learner to read aloud.{topic_hint} "
                f"Set 'prompt' to a brief instruction in {language}. "
                f"Set 'reference_text' to the passage (1-4 sentences for beginner/intermediate, paragraph for advanced)."
            ),
            "situational": (
                f"Generate a situational role-play task in {language} at {level} level.{topic_hint} "
                f"Set 'prompt' to the scenario and task in {language}. "
                f"Set 'reference_text' to a brief evaluator rubric hint in English."
            ),
            "picture_describe": (
                f"Generate a picture description task in {language} at {level} level.{topic_hint} "
                f"Set 'prompt' to the instruction in {language}. "
                f"Set 'reference_text' to a vivid 2-4 sentence English description of the imagined picture."
            ),
            "quick_response": (
                f"Generate a single conversational question in {language} at {level} level.{topic_hint} "
                f"Set 'prompt' to the question. Set 'reference_text' to null."
            ),
            "monologue": (
                f"Generate a monologue topic in {language} at {level} level.{topic_hint} "
                f"Set 'prompt' to the topic with 2-3 guiding points. Set 'reference_text' to null."
            ),
        }
        user_msg = type_instructions.get(
            question_type,
            f"Generate a {question_type} oral question in {language} at {level} level.{topic_hint} "
            f'Return JSON: {{"prompt": "...", "reference_text": null}}',
        )
        try:
            raw = self._chat([
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ])
            return json.loads(raw)
        except Exception:
            return {"prompt": "", "reference_text": None}

    def score_oral_response(
        self,
        question_type: str,
        prompt: str,
        transcription: str,
        context: str | None = None,
        reply_lang: str = "zh-CN",
    ) -> dict:
        from app.services.llm.openai import REPLY_LANG_NAMES
        reply = REPLY_LANG_NAMES.get(reply_lang, reply_lang)
        context_block = f"\nAdditional context: {context}" if context else ""
        rubrics = {
            "situational": (
                "- Grammar of the response (40 pts)\n"
                "- Relevance to the scenario (35 pts)\n"
                "- Natural expression (25 pts)"
            ),
            "picture_describe": (
                "- Content coverage (30 pts)\n"
                "- Logical organization (25 pts)\n"
                "- Vocabulary range (25 pts)\n"
                "- Grammar and fluency (20 pts)"
            ),
            "quick_response": (
                "- Directness and relevance (40 pts)\n"
                "- Grammar accuracy (35 pts)\n"
                "- Vocabulary (25 pts)"
            ),
            "monologue": (
                "- Content depth (30 pts)\n"
                "- Organization (25 pts)\n"
                "- Vocabulary range (25 pts)\n"
                "- Grammar (20 pts)"
            ),
        }
        rubric = rubrics.get(question_type, "- Overall communicative effectiveness (100 pts)")
        system = (
            f"You are an oral language examiner. Score the learner's response and reply in {reply}. "
            f"Return ONLY valid JSON, no extra text: "
            '{{"score": <int 0-100>, "feedback": "<2-3 sentences>", "highlights": ["<observation>"]}}'
        )
        user_msg = (
            f"Question type: {question_type}\n"
            f"Task: {prompt}{context_block}\n\n"
            f"Rubric (100 pts total):\n{rubric}\n\n"
            f"Learner's response:\n{transcription or '(no speech detected)'}"
        )
        try:
            raw = self._chat([
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ])
            return json.loads(raw)
        except Exception:
            return {"score": 50, "feedback": "Scoring service unavailable.", "highlights": []}

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
