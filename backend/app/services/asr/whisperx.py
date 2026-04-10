from typing import Any

from app.config import WhisperXConfig
from app.schemas.audio import Sentence, WordTimestamp
from app.services.asr.base import ASRService


class WhisperXASRService(ASRService):
    def __init__(self, config: WhisperXConfig):
        import whisperx
        from faster_whisper import WhisperModel

        self.config = config
        self._whisperx = whisperx
        self._model = WhisperModel(
            config.model_size,
            device=config.device,
            compute_type=config.compute_type,
        )
        self._align_model, self._align_metadata = whisperx.load_align_model(
            language_code=config.language,
            device=config.device,
        )

    @staticmethod
    def _transcript_segments(segments: list[Any]) -> list[dict]:
        return [
            {
                "start": float(segment.start),
                "end": float(segment.end),
                "text": segment.text,
            }
            for segment in segments
        ]

    @staticmethod
    def _map_words(words: list[dict[str, Any]] | None) -> list[WordTimestamp]:
        mapped_words = []
        for word in words or []:
            text = str(word.get("word", "")).strip()
            start = word.get("start")
            end = word.get("end")
            if not text or start is None or end is None:
                continue
            mapped_words.append(WordTimestamp(word=text, start=float(start), end=float(end)))
        return mapped_words

    @classmethod
    def _map_segments(cls, segments: list[dict[str, Any]]) -> list[Sentence]:
        sentences = []
        for index, segment in enumerate(segments):
            sentences.append(
                Sentence(
                    index=index,
                    text=str(segment.get("text", "")).strip(),
                    start=float(segment["start"]),
                    end=float(segment["end"]),
                    words=cls._map_words(segment.get("words")),
                )
            )
        return sentences

    def transcribe(self, audio_path: str) -> list[Sentence]:
        audio = self._whisperx.load_audio(audio_path)
        segments, _ = self._model.transcribe(
            audio,
            language=self.config.language,
            beam_size=5,
        )
        transcript = self._transcript_segments(list(segments))
        aligned = self._whisperx.align(
            transcript,
            self._align_model,
            self._align_metadata,
            audio,
            self.config.device,
        )
        return self._map_segments(aligned["segments"])
