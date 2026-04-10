import pytest

from app.services.asr.whisperx import WhisperXASRService


def test_map_segments_filters_invalid_words_and_maps_sentences():
    segments = [
        {
            "text": "  First sentence  ",
            "start": 0,
            "end": "2.5",
            "words": [
                {"word": "  Hello  ", "start": 0, "end": "0.5"},
                {"word": "", "start": 0.5, "end": 0.8},
                {"word": "missing-start", "end": 1.0},
                {"word": "missing-end", "start": 1.0},
                {"word": "   ", "start": 1.0, "end": 1.2},
            ],
        },
        {
            "text": "  Second sentence ",
            "start": "3",
            "end": 4,
            "words": [
                {"word": " world ", "start": "3.1", "end": 3.6},
            ],
        },
    ]

    sentences = WhisperXASRService._map_segments(segments)

    assert [sentence.index for sentence in sentences] == [0, 1]

    assert sentences[0].text == "First sentence"
    assert sentences[0].start == pytest.approx(0.0)
    assert sentences[0].end == pytest.approx(2.5)
    assert len(sentences[0].words) == 1

    first_word = sentences[0].words[0]
    assert first_word.word == "Hello"
    assert first_word.start == pytest.approx(0.0)
    assert first_word.end == pytest.approx(0.5)

    assert sentences[1].text == "Second sentence"
    assert sentences[1].start == pytest.approx(3.0)
    assert sentences[1].end == pytest.approx(4.0)
    assert len(sentences[1].words) == 1
    assert sentences[1].words[0].word == "world"
    assert sentences[1].words[0].start == pytest.approx(3.1)
    assert sentences[1].words[0].end == pytest.approx(3.6)
