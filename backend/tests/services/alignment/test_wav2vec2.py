from pathlib import Path

import pytest

from app.config import Wav2Vec2AlignmentConfig
from app.schemas.audio import WordTimestamp
from app.services.alignment.wav2vec2 import Wav2Vec2AlignmentService


def _skip_on_model_load_error(error: Exception) -> None:
    if isinstance(error, (OSError, ConnectionError, TimeoutError)):
        pytest.skip(f"wav2vec2 model loading unavailable: {error}")

    message = str(error)
    if any(fragment in message for fragment in ("Cannot send a request", "EOF occurred", "timed out", "Connection")):
        pytest.skip(f"wav2vec2 model loading unavailable: {message}")

    raise error


@pytest.mark.slow
def test_wav2vec2_alignment_service_aligns_sample_fixture():
    fixture_path = Path(__file__).resolve().parents[1] / "asr" / "fixtures" / "sample.mp3"
    if not fixture_path.exists():
        pytest.skip(f"Missing alignment fixture: {fixture_path}")

    reference_text = "Hello world, this is a test recording."

    try:
        service = Wav2Vec2AlignmentService(
            Wav2Vec2AlignmentConfig(
                model_id="facebook/wav2vec2-base-960h",
                device="cpu",
            )
        )
    except Exception as error:
        _skip_on_model_load_error(error)

    try:
        aligned_words = service.align(str(fixture_path), reference_text)
    except Exception as error:
        _skip_on_model_load_error(error)

    assert aligned_words
    assert all(isinstance(word, WordTimestamp) for word in aligned_words)
    assert all(word.start >= 0 for word in aligned_words)
    assert all(word.start < word.end for word in aligned_words)
    # timestamps must be monotonically non-decreasing
    starts = [w.start for w in aligned_words]
    assert starts == sorted(starts)
