import json
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

    def generate_question(
        self,
        question_type: str,
        language: str,
        difficulty: str = "intermediate",
        topic: str | None = None,
    ) -> dict:
        topic_hint = f" The topic should relate to: {topic}." if topic else ""
        difficulty_map = {"beginner": "simple", "intermediate": "moderate", "advanced": "complex"}
        level = difficulty_map.get(difficulty, "moderate")
        system = (
            "You are an oral language exam question designer. "
            "Generate a single practice question for a language learner. "
            "Respond with ONLY valid JSON: "
            '{"prompt": "<instruction shown to learner>", "reference_text": "<text or null>"}'
        )
        type_instructions = {
            "read_aloud": (
                f"Generate a {level}-level passage in {language} for the learner to read aloud.{topic_hint} "
                f"Set 'prompt' to a brief instruction in {language} (e.g. 'Please read the following text aloud.'). "
                f"Set 'reference_text' to the passage text (1-4 sentences for beginner/intermediate, "
                f"a full paragraph for advanced)."
            ),
            "situational": (
                f"Generate a situational role-play task in {language} at {level} level.{topic_hint} "
                f"Set 'prompt' to the scenario description and task instruction in {language}. "
                f"Set 'reference_text' to a brief rubric hint for the evaluator (in English). "
                f"Do NOT include the expected answer in the prompt."
            ),
            "picture_describe": (
                f"Generate a picture description task in {language} at {level} level.{topic_hint} "
                f"Set 'prompt' to the instruction in {language} (e.g. 'Describe the scene and give your opinion.'). "
                f"Set 'reference_text' to a vivid 2-4 sentence description of the imagined picture in English "
                f"(this will be shown to the learner as the 'picture')."
            ),
            "quick_response": (
                f"Generate a single conversational question in {language} at {level} level.{topic_hint} "
                f"Set 'prompt' to the question. Set 'reference_text' to null."
            ),
            "monologue": (
                f"Generate a monologue topic prompt in {language} at {level} level.{topic_hint} "
                f"Set 'prompt' to the topic instruction (2-3 guiding points to address). "
                f"Set 'reference_text' to null."
            ),
        }
        user_msg = type_instructions.get(
            question_type,
            f"Generate a {question_type} oral practice question in {language} at {level} level.{topic_hint} "
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
        reply = REPLY_LANG_NAMES.get(reply_lang, reply_lang)
        context_block = f"\nAdditional context: {context}" if context else ""
        rubrics = {
            "situational": (
                "- Grammar of the response (40 pts): correct question/sentence formation, tense, articles\n"
                "- Relevance to the scenario (35 pts): does it address the situation?\n"
                "- Natural expression (25 pts): native-like phrasing, appropriate vocabulary"
            ),
            "picture_describe": (
                "- Content coverage (30 pts): does the learner mention the main elements?\n"
                "- Logical organization (25 pts): clear structure with description and opinion\n"
                "- Vocabulary range (25 pts): varied and appropriate word choices\n"
                "- Grammar and fluency (20 pts): complex sentences, minimal errors"
            ),
            "quick_response": (
                "- Directness and relevance (40 pts): does it answer the question?\n"
                "- Grammar accuracy (35 pts): correct tense, agreement, structure\n"
                "- Vocabulary (25 pts): appropriate word choice"
            ),
            "monologue": (
                "- Content depth (30 pts): addresses the topic with ideas and examples\n"
                "- Organization (25 pts): logical flow with introduction, body, conclusion\n"
                "- Vocabulary range (25 pts): varied, topic-appropriate vocabulary\n"
                "- Grammar (20 pts): complex structures, minimal errors"
            ),
        }
        rubric = rubrics.get(question_type, "- Overall communicative effectiveness (100 pts)")
        system = (
            f"You are an oral language examiner. Score the learner's response and reply in {reply}. "
            f"Return ONLY valid JSON: "
            '{{"score": <int 0-100>, "feedback": "<2-3 sentences>", "highlights": ["<observation>", "..."]}}'
        )
        user_msg = (
            f"Question type: {question_type}\n"
            f"Task shown to learner: {prompt}{context_block}\n\n"
            f"Scoring rubric (total 100 pts):\n{rubric}\n\n"
            f"Learner's transcribed response:\n{transcription or '(no speech detected)'}"
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
