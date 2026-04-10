from dataclasses import dataclass

import pytest

from app.services.alignment.wav2vec2 import Wav2Vec2AlignmentService


@dataclass
class FakeSpan:
    start: int
    end: int


def test_reference_words_strips_punctuation_and_drops_empty_parts():
    words = Wav2Vec2AlignmentService._reference_words('"Hello," -- don\'t! (...)')

    assert words == [("Hello", "HELLO"), ("don't", "DON'T")]


def test_target_tokens_inserts_word_separators():
    transcript_chars, char_to_word = Wav2Vec2AlignmentService._target_tokens(
        [("Hello", "HELLO"), ("world", "WORLD")]
    )

    assert transcript_chars == list("HELLO|WORLD")
    assert char_to_word == [0, 0, 0, 0, 0, None, 1, 1, 1, 1, 1]


def test_word_spans_aggregates_word_bounds_and_skips_separator_spans():
    words = [("Hello", "HELLO"), ("world", "WORLD")]
    transcript_chars = list("HELLO|WORLD")
    char_to_word = [0, 0, 0, 0, 0, None, 1, 1, 1, 1, 1]
    token_spans = [
        FakeSpan(0, 1),
        FakeSpan(1, 2),
        FakeSpan(2, 3),
        FakeSpan(3, 5),
        FakeSpan(5, 6),
        FakeSpan(100, 200),
        FakeSpan(6, 7),
        FakeSpan(7, 9),
        FakeSpan(9, 10),
        FakeSpan(10, 12),
        FakeSpan(12, 13),
    ]

    aligned_words = Wav2Vec2AlignmentService._word_spans(
        words,
        transcript_chars,
        char_to_word,
        token_spans,
        seconds_per_frame=0.25,
    )

    assert len(aligned_words) == 2
    assert aligned_words[0].word == "Hello"
    assert aligned_words[0].start == pytest.approx(0.0)
    assert aligned_words[0].end == pytest.approx(1.5)
    assert aligned_words[1].word == "world"
    assert aligned_words[1].start == pytest.approx(1.5)
    assert aligned_words[1].end == pytest.approx(3.25)
