from app.schemas.audio import WordTimestamp
from app.services.scoring.phoneme import PhonemeScoringService


def test_completeness_score_returns_full_score_for_full_coverage():
    aligned_words = [
        WordTimestamp(word="hello", start=0.0, end=0.5),
        WordTimestamp(word="world", start=0.5, end=1.0),
    ]

    score = PhonemeScoringService._completeness_score(["hello", "world"], aligned_words)

    assert score == 100.0


def test_completeness_score_scales_with_partial_coverage():
    aligned_words = [
        WordTimestamp(word="hello", start=0.0, end=0.5),
        WordTimestamp(word="world", start=0.5, end=1.0),
    ]

    score = PhonemeScoringService._completeness_score(["one", "two", "three", "four"], aligned_words)

    assert score == 50.0


def test_completeness_score_returns_full_score_for_empty_reference_words():
    aligned_words = [WordTimestamp(word="extra", start=0.0, end=0.5)]

    score = PhonemeScoringService._completeness_score([], aligned_words)

    assert score == 100.0
