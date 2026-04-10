import pytest

from app.config import PhonemeScoringConfig
from app.schemas.audio import WordTimestamp
from app.services.scoring.phoneme import PhonemeScoringService


def test_strip_stress_removes_markers():
    assert PhonemeScoringService._strip_stress("dˈeɪ") == "deɪ"
    assert PhonemeScoringService._strip_stress("wˌʌn") == "wʌn"
    assert PhonemeScoringService._strip_stress("hello") == "hello"


def test_match_reference_to_aligned_handles_skipped_words():
    reference_words = ["the", "cat", "sat"]
    aligned_words = [
        WordTimestamp(word="cat", start=0.2, end=0.5),
        WordTimestamp(word="sat", start=0.6, end=0.9),
    ]

    matches = PhonemeScoringService._match_reference_to_aligned(reference_words, aligned_words)

    assert matches[0] is None
    assert matches[1].word == "cat"  # type: ignore[union-attr]
    assert matches[2].word == "sat"  # type: ignore[union-attr]


def test_score_missing_word_gets_zero(monkeypatch):
    service = PhonemeScoringService(PhonemeScoringConfig())

    import torch
    monkeypatch.setattr(service, "_phonemize_words", lambda words: ["hɛloʊ", "wɜld"])
    monkeypatch.setattr(service, "_load_waveform", lambda path: (torch.zeros(1, 16000), 16000))
    monkeypatch.setattr(service, "_load_model", lambda: True)
    monkeypatch.setattr(service, "_forced_align_scores", lambda waveform, phonemes, device: ([85.0], [[80.0, 90.0]]))

    result = service.score(
        recording_path="dummy.wav",
        reference_text="hello world",
        aligned_words=[WordTimestamp(word="hello", start=0.0, end=0.5)],
    )

    assert [ws.word for ws in result.word_scores] == ["hello", "world"]
    assert result.word_scores[0].accuracy_score == 85.0
    assert result.word_scores[1].accuracy_score == 0.0
    assert result.accuracy_score == pytest.approx(42.5)
