import math
import os
import re
import subprocess
import tempfile

import soundfile as sf
import torch
import torchaudio
from Levenshtein import distance as levenshtein_distance

from app.config import PhonemeScoringConfig
from app.schemas.audio import WordTimestamp
from app.schemas.practice import WordScore
from app.services.scoring.base import ScoringResult, ScoringService


class PhonemeScoringService(ScoringService):
    def __init__(self, config: PhonemeScoringConfig):
        self.config = config
        self._processor = None
        self._model = None
        self._model_device = "cpu"
        self._phonemizer_available = None

    @staticmethod
    def _display_word(word: str) -> str:
        return re.sub(r"(^[^A-Za-z']+|[^A-Za-z']+$)", "", word)

    @classmethod
    def _reference_words(cls, reference_text: str) -> list[str]:
        words = []
        for part in reference_text.split():
            display = cls._display_word(part)
            if display:
                words.append(display)
        return words

    @staticmethod
    def _normalize_text(text: str) -> str:
        return re.sub(r"[^A-Za-z']", "", text).lower()

    _STRESS_RE = re.compile(r"[ˈˌ]")

    @classmethod
    def _strip_stress(cls, phonemes: str) -> str:
        return cls._STRESS_RE.sub("", phonemes)

    @staticmethod
    def _completeness_score(reference_words: list[str], aligned_words: list[WordTimestamp]) -> float:
        if not reference_words:
            return 100.0
        return min(100.0, 100.0 * len(aligned_words) / len(reference_words))

    @staticmethod
    def _fluency_score(aligned_words: list[WordTimestamp]) -> float:
        if not aligned_words:
            return 0.0
        if len(aligned_words) == 1:
            return 100.0

        total_duration = max(aligned_words[-1].end - aligned_words[0].start, 1e-6)
        gaps = [
            max(0.0, current.start - previous.end)
            for previous, current in zip(aligned_words, aligned_words[1:])
        ]
        excess_pause = sum(max(0.0, gap - 0.25) for gap in gaps)
        gap_score = max(0.0, 100.0 - excess_pause * 120.0)

        words_per_second = len(aligned_words) / total_duration
        rate_score = max(0.0, 100.0 - abs(words_per_second - 2.5) / 2.5 * 50.0)
        return max(0.0, min(100.0, 0.7 * gap_score + 0.3 * rate_score))

    @classmethod
    def _match_reference_to_aligned(
        cls,
        reference_words: list[str],
        aligned_words: list[WordTimestamp],
    ) -> list[WordTimestamp | None]:
        matches: list[WordTimestamp | None] = []
        aligned_index = 0
        for reference_word in reference_words:
            norm_ref = cls._normalize_text(reference_word)
            found = False
            scan = aligned_index
            while scan < len(aligned_words):
                if cls._normalize_text(aligned_words[scan].word) == norm_ref:
                    matches.append(aligned_words[scan])
                    aligned_index = scan + 1
                    found = True
                    break
                scan += 1
            if not found:
                matches.append(None)
        return matches

    def _load_model(self) -> bool:
        if self._model is not None and self._processor is not None:
            return True

        try:
            from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

            self._processor = Wav2Vec2Processor.from_pretrained(self.config.phoneme_model_id)
            self._model = Wav2Vec2ForCTC.from_pretrained(self.config.phoneme_model_id).eval()
            self._move_model(self.config.device)
            return True
        except (OSError, ConnectionError, TimeoutError):
            self._processor = None
            self._model = None
            self._model_device = "cpu"
            return False

    def _move_model(self, device: str) -> None:
        if self._model is not None and self._model_device != device:
            self._model = self._model.to(device)
            self._model_device = device

    def _phonemize_words(self, words: list[str]) -> list[str]:
        if not words:
            return []

        if self._phonemizer_available is False:
            return [self._normalize_text(word) for word in words]

        try:
            from phonemizer import phonemize

            phonemes = phonemize(
                words,
                language="en-us",
                backend="espeak",
                strip=True,
                preserve_punctuation=False,
                with_stress=True,
            )
            self._phonemizer_available = True
            return [str(phoneme) for phoneme in phonemes]
        except RuntimeError:
            self._phonemizer_available = False
            return [self._normalize_text(word) for word in words]

    @staticmethod
    def _load_waveform(recording_path: str) -> tuple[torch.Tensor, int]:
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        tmp.close()
        try:
            subprocess.run(
                ['ffmpeg', '-y', '-i', recording_path, '-f', 'wav', tmp.name],
                check=True, capture_output=True,
            )
            waveform, sample_rate = sf.read(tmp.name, always_2d=True)
        finally:
            os.unlink(tmp.name)
        tensor = torch.from_numpy(waveform.T).to(torch.float32)
        if tensor.shape[0] > 1:
            tensor = tensor.mean(dim=0, keepdim=True)
        return tensor, sample_rate

    def _get_log_probs(self, waveform: torch.Tensor, device: str) -> torch.Tensor:
        """Run full waveform through the phoneme model, return log_probs [T, C]."""
        inputs = self._processor(
            waveform.squeeze(0).cpu().numpy(),
            sampling_rate=16000,
            return_tensors="pt",
        )
        batch = {k: v.to(device) for k, v in inputs.items()}
        self._move_model(device)
        with torch.inference_mode():
            logits = self._model(**batch).logits  # [1, T, C]
        return torch.log_softmax(logits[0], dim=-1)  # [T, C]

    def _phonemes_to_tokens(
        self, phonemes_per_word: list[str]
    ) -> tuple[list[int], list[int]]:
        """
        Convert per-word phoneme strings to a flat token ID list and per-word lengths.
        Strips stress markers; skips characters not in the model vocabulary.
        """
        vocab = self._processor.tokenizer.get_vocab()
        all_tokens: list[int] = []
        word_lengths: list[int] = []
        for phoneme_str in phonemes_per_word:
            clean = self._strip_stress(phoneme_str)
            tokens = [vocab[ch] for ch in clean if ch in vocab]
            all_tokens.extend(tokens)
            word_lengths.append(len(tokens))
        return all_tokens, word_lengths

    def _forced_align_scores(
        self,
        waveform: torch.Tensor,
        expected_phonemes: list[str],
        device: str,
    ) -> tuple[list[float], list[list[float]]]:
        """
        Return (per-word accuracy scores, per-word phoneme scores) using CTC forced alignment.
        phoneme_scores[i] has one score per token in expected_phonemes[i] (stress markers excluded).
        Falls back to zeros if alignment fails.
        """
        zero_word = [0.0] * len(expected_phonemes)
        zero_ph = [[] for _ in expected_phonemes]

        try:
            log_probs = self._get_log_probs(waveform, device)
        except (NotImplementedError, RuntimeError):
            if device != "mps":
                return zero_word, zero_ph
            log_probs = self._get_log_probs(waveform, "cpu")

        token_ids, word_lengths = self._phonemes_to_tokens(expected_phonemes)
        if not token_ids:
            return zero_word, zero_ph

        blank = self._processor.tokenizer.pad_token_id
        targets = torch.tensor([token_ids], dtype=torch.int32)
        input_lengths = torch.tensor([log_probs.shape[0]], dtype=torch.int32)
        target_lengths = torch.tensor([len(token_ids)], dtype=torch.int32)

        try:
            aligned_tokens, scores = torchaudio.functional.forced_align(
                log_probs.unsqueeze(0).cpu(),
                targets,
                input_lengths=input_lengths,
                target_lengths=target_lengths,
                blank=blank,
            )
        except Exception:
            return zero_word, zero_ph

        token_spans = torchaudio.functional.merge_tokens(
            aligned_tokens[0], scores[0], blank=blank
        )

        # Convert per-token log-prob → 0-100
        flat_phoneme_scores = [
            100.0 * min(1.0, math.exp(span.score)) for span in token_spans
        ]
        while len(flat_phoneme_scores) < len(token_ids):
            flat_phoneme_scores.append(0.0)

        # Split flat scores back into per-word lists
        word_acc: list[float] = []
        per_word_ph: list[list[float]] = []
        idx = 0
        for length in word_lengths:
            if length == 0:
                word_acc.append(0.0)
                per_word_ph.append([])
            else:
                ph = flat_phoneme_scores[idx: idx + length]
                word_acc.append(sum(ph) / len(ph))
                per_word_ph.append(ph)
            idx += length

        return word_acc, per_word_ph

    def phonemize_words(self, words: list[str]) -> list[str]:
        return self._phonemize_words(words)

    def score(
        self,
        recording_path: str,
        reference_text: str,
        aligned_words: list[WordTimestamp],
    ) -> ScoringResult:
        reference_words = self._reference_words(reference_text)
        expected_phonemes = self._phonemize_words(reference_words)
        matched_words = self._match_reference_to_aligned(reference_words, aligned_words)

        waveform, sample_rate = self._load_waveform(recording_path)
        if sample_rate != 16000:
            waveform = torchaudio.functional.resample(waveform, sample_rate, 16000)

        all_word_acc = [0.0] * len(reference_words)
        all_ph_scores: list[list[float]] = [[] for _ in reference_words]

        if self._load_model() and matched_words:
            present_indices = [i for i, m in enumerate(matched_words) if m is not None]
            present_phonemes = [expected_phonemes[i] for i in present_indices]
            if present_phonemes:
                try:
                    present_acc, present_ph = self._forced_align_scores(
                        waveform, present_phonemes, self.config.device
                    )
                    for i, acc, ph in zip(present_indices, present_acc, present_ph):
                        all_word_acc[i] = acc
                        all_ph_scores[i] = ph
                except Exception:
                    pass

        word_scores = [
            WordScore(
                word=ref_word,
                accuracy_score=acc,
                expected_phonemes=exp_ph,
                actual_phonemes="",
                phoneme_scores=ph,
            )
            for ref_word, exp_ph, acc, ph in zip(
                reference_words, expected_phonemes, all_word_acc, all_ph_scores
            )
        ]

        accuracy_score = (
            sum(all_word_acc) / len(all_word_acc) if all_word_acc else 100.0
        )

        # Only count words with accuracy >= 15 as actually spoken
        SPOKEN_THRESHOLD = 15.0
        spoken_count = sum(1 for acc in all_word_acc if acc >= SPOKEN_THRESHOLD)
        completeness_score = (
            min(100.0, 100.0 * spoken_count / len(reference_words))
            if reference_words else 100.0
        )

        # Fluency only from words that were actually spoken
        spoken_aligned = [
            w for w, acc in zip(matched_words, all_word_acc)
            if w is not None and acc >= SPOKEN_THRESHOLD
        ]
        fluency_score = self._fluency_score(spoken_aligned)

        return ScoringResult(
            accuracy_score=accuracy_score,
            fluency_score=fluency_score,
            completeness_score=completeness_score,
            word_scores=word_scores,
        )
