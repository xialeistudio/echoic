from pathlib import Path

import pytest

from app.config import WhisperXConfig
from app.services.asr.whisperx import WhisperXASRService


def _skip_on_model_download_error(error: Exception) -> None:
    if isinstance(error, (OSError, ConnectionError, TimeoutError)):
        pytest.skip(f"WhisperX model download unavailable: {error}")
    message = str(error)
    if any(s in message for s in ("Cannot send a request", "EOF occurred", "timed out", "Connection")):
        pytest.skip(f"WhisperX model download unavailable: {message}")
    raise error


@pytest.mark.slow
def test_whisperx_asr_service_transcribes_sample_fixture():
    fixture_path = Path(__file__).with_name("fixtures") / "sample.mp3"
    if not fixture_path.exists():
        pytest.skip(f"Missing WhisperX fixture: {fixture_path}")

    try:
        service = WhisperXASRService(
            WhisperXConfig(
                model_size="tiny",
                device="cpu",
                compute_type="int8",
                language="en",
                batch_size=2,
            )
        )
    except RuntimeError as error:
        _skip_on_model_download_error(error)

    try:
        sentences = service.transcribe(str(fixture_path))
    except RuntimeError as error:
        _skip_on_model_download_error(error)

    assert sentences
    assert all(sentence.text.strip() for sentence in sentences)
    assert all(sentence.start < sentence.end for sentence in sentences)

    mapped_words = [word for sentence in sentences for word in sentence.words]
    assert mapped_words, "Expected at least some word-level timestamps"
    assert all(word.start >= 0 for word in mapped_words)
    assert all(word.start < word.end for word in mapped_words)
    for sentence in sentences:
        for word in sentence.words:
            assert sentence.start <= word.start
            assert word.end <= sentence.end
