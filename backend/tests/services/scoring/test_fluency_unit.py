from app.schemas.audio import WordTimestamp
from app.services.scoring.phoneme import PhonemeScoringService


def _word(word: str, start: float, end: float) -> WordTimestamp:
    return WordTimestamp(word=word, start=start, end=end)


def test_fluency_score_is_zero_for_no_words():
    assert PhonemeScoringService._fluency_score([]) == 0.0


def test_fluency_score_is_perfect_for_one_word():
    aligned_words = [_word("hello", 0.0, 0.5)]

    assert PhonemeScoringService._fluency_score(aligned_words) == 100.0


def test_fluency_score_penalizes_long_pauses_more_than_tight_spacing():
    tight_sequence = [
        _word("one", 0.0, 0.4),
        _word("two", 0.45, 0.85),
        _word("three", 0.9, 1.3),
    ]
    long_pause_sequence = [
        _word("one", 0.0, 0.4),
        _word("two", 1.2, 1.6),
        _word("three", 1.65, 2.05),
    ]

    tight_score = PhonemeScoringService._fluency_score(tight_sequence)
    long_pause_score = PhonemeScoringService._fluency_score(long_pause_sequence)

    assert tight_score > 90.0
    assert long_pause_score < 60.0
    assert long_pause_score < tight_score
