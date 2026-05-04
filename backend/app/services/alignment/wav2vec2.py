import os
import re
import subprocess
import tempfile

import soundfile as sf
import torch
import torchaudio

from app.config import Wav2Vec2AlignmentConfig
from app.schemas.audio import WordTimestamp
from app.services.alignment.base import AlignmentService


_BUNDLE_REGISTRY = {
    "facebook/wav2vec2-base-960h": lambda: torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H,
    "facebook/wav2vec2-large-960h": lambda: torchaudio.pipelines.WAV2VEC2_ASR_LARGE_960H,
}

# Languages routed through whisperx.align() instead of torchaudio CTC bundles
# English uses the torchaudio CTC path (faster, trained on English LibriSpeech).
# Everything else uses whisperx, which downloads a language-specific wav2vec2
# alignment model from HuggingFace on first use (~400 MB, then cached).
_WHISPERX_LANGUAGES = {"ja", "ko", "fr", "de", "es", "it", "pt", "ru"}


class Wav2Vec2AlignmentService(AlignmentService):
    def __init__(self, config: Wav2Vec2AlignmentConfig):
        self.config = config

        if config.language in _WHISPERX_LANGUAGES:
            self._use_whisperx = True
            self._wx_model = None
            self._wx_metadata = None
            self._load_whisperx_model()
        else:
            self._use_whisperx = False
            if config.model_id not in _BUNDLE_REGISTRY:
                raise ValueError(
                    f"Unsupported alignment model: {config.model_id}. "
                    f"Supported: {list(_BUNDLE_REGISTRY)}"
                )
            self._bundle = _BUNDLE_REGISTRY[config.model_id]()
            self._sample_rate = self._bundle.sample_rate
            self._labels = self._bundle.get_labels()
            self._label_to_token = {label: index for index, label in enumerate(self._labels)}
            self._blank = self._label_to_token["-"]
            self._model = self._bundle.get_model().eval()
            self._model_device = "cpu"
            self._move_model(config.device)

    def _load_whisperx_model(self) -> None:
        import whisperx
        self._wx_model, self._wx_metadata = whisperx.load_align_model(
            language_code=self.config.language,
            device=self.config.device,
        )

    # text helpers (Unicode-aware, works for Latin and CJK)

    @staticmethod
    def _display_word(word: str) -> str:
        return re.sub(r"(^\W+|\W+$)", "", word)

    @classmethod
    def _reference_words(cls, reference_text: str) -> list[tuple[str, str]]:
        words = []
        for part in reference_text.split():
            display = cls._display_word(part)
            normalized = re.sub(r"[^\w']", "", display).upper()
            if normalized:
                words.append((display, normalized))
        return words

    # torchaudio CTC path (English / Latin-script languages)

    @staticmethod
    def _target_tokens(words: list[tuple[str, str]]) -> tuple[list[str], list[int | None]]:
        transcript_chars = []
        char_to_word = []
        for index, (_, normalized) in enumerate(words):
            if transcript_chars:
                transcript_chars.append("|")
                char_to_word.append(None)
            for character in normalized:
                transcript_chars.append(character)
                char_to_word.append(index)
        return transcript_chars, char_to_word

    @staticmethod
    def _word_spans(
        words: list[tuple[str, str]],
        transcript_chars: list[str],
        char_to_word: list[int | None],
        token_spans: list,
        seconds_per_frame: float,
    ) -> list[WordTimestamp]:
        if len(token_spans) != len(transcript_chars):
            raise ValueError("Alignment token count did not match transcript token count")

        bounds: dict[int, tuple[float, float]] = {}
        for span, word_index in zip(token_spans, char_to_word, strict=True):
            if word_index is None:
                continue

            start = float(span.start) * seconds_per_frame
            end = float(span.end) * seconds_per_frame
            if word_index in bounds:
                bounds[word_index] = (bounds[word_index][0], end)
            else:
                bounds[word_index] = (start, end)

        aligned_words = []
        for index, (display, _) in enumerate(words):
            if index not in bounds or not display:
                continue
            start, end = bounds[index]
            aligned_words.append(WordTimestamp(word=display, start=start, end=end))
        return aligned_words

    def _move_model(self, device: str) -> None:
        if self._model_device != device:
            self._model = self._model.to(device)
            self._model_device = device

    def _load_waveform(self, audio_path: str) -> torch.Tensor:
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        tmp.close()
        try:
            subprocess.run(
                ['ffmpeg', '-y', '-i', audio_path, '-f', 'wav', tmp.name],
                check=True, capture_output=True,
            )
            waveform, sample_rate = sf.read(tmp.name, always_2d=True)
        finally:
            os.unlink(tmp.name)
        tensor = torch.from_numpy(waveform.T).to(torch.float32)
        if tensor.shape[0] > 1:
            tensor = tensor.mean(dim=0, keepdim=True)
        if sample_rate != self._sample_rate:
            tensor = torchaudio.functional.resample(tensor, sample_rate, self._sample_rate)
        return tensor

    def _align_on_device(self, waveform: torch.Tensor, reference_text: str, device: str) -> list[WordTimestamp]:
        words = self._reference_words(reference_text)
        if not words:
            return []

        transcript_chars, char_to_word = self._target_tokens(words)
        targets = torch.tensor(
            [[self._label_to_token[character] for character in transcript_chars]],
            dtype=torch.int64,
        )

        self._move_model(device)
        waveform = waveform.to(device)
        lengths = torch.tensor([waveform.shape[1]], dtype=torch.int64, device=device)

        with torch.inference_mode():
            emissions, emission_lengths = self._model(waveform, lengths)
            log_probs = torch.log_softmax(emissions, dim=-1)
            aligned_tokens, scores = torchaudio.functional.forced_align(
                log_probs.cpu(),
                targets,
                input_lengths=emission_lengths.cpu() if emission_lengths is not None else None,
                target_lengths=torch.tensor([targets.shape[1]], dtype=torch.int64),
                blank=self._blank,
            )

        token_spans = torchaudio.functional.merge_tokens(
            aligned_tokens[0],
            scores[0],
            blank=self._blank,
        )
        seconds_per_frame = waveform.shape[1] / self._sample_rate / log_probs.shape[1]
        return self._word_spans(words, transcript_chars, char_to_word, token_spans, seconds_per_frame)

    # whisperx path (Japanese and other HuggingFace-model languages)

    def _whisperx_align(self, audio_path: str, reference_text: str) -> list[WordTimestamp]:
        import whisperx

        audio = whisperx.load_audio(audio_path)
        duration = len(audio) / 16000.0
        segments = [{"start": 0.0, "end": duration, "text": reference_text}]

        result = whisperx.align(
            segments,
            self._wx_model,
            self._wx_metadata,
            audio,
            self.config.device,
            return_char_alignments=False,
        )

        aligned_words = []
        for ws in result.get("word_segments", []):
            word = str(ws.get("word", "")).strip()
            start = ws.get("start")
            end = ws.get("end")
            if word and start is not None and end is not None:
                aligned_words.append(WordTimestamp(word=word, start=float(start), end=float(end)))
        return aligned_words

    # public entry point

    def align(self, audio_path: str, reference_text: str) -> list[WordTimestamp]:
        if self._use_whisperx:
            return self._whisperx_align(audio_path, reference_text)

        waveform = self._load_waveform(audio_path)
        try:
            return self._align_on_device(waveform, reference_text, self.config.device)
        except (NotImplementedError, RuntimeError):
            if self.config.device != "mps":
                raise
            return self._align_on_device(waveform.cpu(), reference_text, "cpu")
