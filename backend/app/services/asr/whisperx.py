import re
from typing import Any

from app.config import WhisperXConfig
from app.schemas.audio import Sentence, WordTimestamp
from app.services.asr.base import ASRService

_SENTENCE_END = re.compile(r'[.?!]["\'»]?\s*$')
_PAD = 0.15  # seconds of silence to keep before/after each sentence


class WhisperXASRService(ASRService):
    def __init__(self, config: WhisperXConfig):
        from faster_whisper import WhisperModel

        self.config = config
        self._model = WhisperModel(
            config.model_size,
            device=config.device,
            compute_type=config.compute_type,
        )

    @staticmethod
    def _segments_to_dicts(segments: list[Any]) -> list[dict[str, Any]]:
        return [
            {
                "start": float(seg.start),
                "end": float(seg.end),
                "text": seg.text,
                "words": [
                    {"word": w.word, "start": w.start, "end": w.end}
                    for w in (seg.words or [])
                ],
            }
            for seg in segments
        ]

    @staticmethod
    def _merge_to_sentences(
        segments: list[dict[str, Any]],
        min_words: int = 3,
        max_words: int = 80,
    ) -> list[dict[str, Any]]:
        """Merge VAD fragments into complete sentences.

        Uses segment-level start/end for clip boundaries (Whisper acoustic model
        output, ±20ms) rather than word timestamps (CTC alignment, ±100ms).
        Word timestamps are preserved only for in-sentence highlighting.

        Flushes at sentence-ending punctuation (.?!) with a min_words guard,
        or when the buffer exceeds max_words. When flushing at the last word of
        a segment, the segment's end is used as the clip boundary; otherwise
        the word's end is used as a fallback.
        """
        result: list[dict[str, Any]] = []
        buf_words: list[dict[str, Any]] = []
        sent_start: float | None = None
        sent_end: float | None = None

        def flush() -> None:
            nonlocal sent_start, sent_end
            if not buf_words or sent_start is None or sent_end is None:
                return
            result.append({
                "start": sent_start,
                "end": sent_end,
                "text": " ".join(w["word"].strip() for w in buf_words).strip(),
                "words": list(buf_words),
            })
            buf_words.clear()
            sent_start = None
            sent_end = None

        for seg in segments:
            seg_words = seg.get("words", [])
            n = len(seg_words)
            for i, word in enumerate(seg_words):
                if sent_start is None:
                    # Segment boundary → use accurate acoustic start.
                    # Mid-segment (after a flush) → fall back to word timestamp.
                    sent_start = float(seg["start"]) if i == 0 else float(word.get("start", seg["start"]))
                buf_words.append(word)

                word_text = str(word.get("word", "")).strip()
                is_last_in_seg = (i == n - 1)
                should_flush = (
                    bool(_SENTENCE_END.search(word_text)) and len(buf_words) >= min_words
                ) or len(buf_words) >= max_words

                if should_flush:
                    sent_end = (
                        float(seg["end"]) if is_last_in_seg
                        else float(word.get("end", seg["end"]))
                    )
                    flush()

            # Accumulate segment end for words not yet flushed
            if buf_words:
                sent_end = float(seg["end"])

        flush()

        # Add silence padding around each sentence.
        # Between adjacent sentences: pad up to half the gap so clips never overlap.
        # At the edges (first/last): pad by _PAD unconditionally.
        for i, sent in enumerate(result):
            prev_end = result[i - 1]["end"] if i > 0 else None
            next_start = result[i + 1]["start"] if i < len(result) - 1 else None

            lead = min(_PAD, (sent["start"] - prev_end) / 2) if prev_end is not None else _PAD
            tail = min(_PAD, (next_start - sent["end"]) / 2) if next_start is not None else _PAD

            result[i]["start"] = max(0.0, sent["start"] - lead)
            result[i]["end"] = sent["end"] + tail

        return result

    @staticmethod
    def _map_words(words: list[dict[str, Any]] | None) -> list[WordTimestamp]:
        mapped = []
        for w in words or []:
            text = str(w.get("word", "")).strip()
            start = w.get("start")
            end = w.get("end")
            if not text or start is None or end is None:
                continue
            mapped.append(WordTimestamp(word=text, start=float(start), end=float(end)))
        return mapped

    @classmethod
    def _map_segments(cls, segments: list[dict[str, Any]]) -> list[Sentence]:
        return [
            Sentence(
                index=i,
                text=str(seg.get("text", "")).strip(),
                start=float(seg["start"]),
                end=float(seg["end"]),
                words=cls._map_words(seg.get("words")),
            )
            for i, seg in enumerate(segments)
        ]

    def transcribe(self, audio_path: str) -> list[Sentence]:
        segments, _ = self._model.transcribe(
            audio_path,
            language=self.config.language,
            beam_size=5,
            vad_filter=True,
            word_timestamps=True,
        )
        seg_dicts = self._segments_to_dicts(list(segments))
        merged = self._merge_to_sentences(seg_dicts)
        return self._map_segments(merged if merged else seg_dicts)
