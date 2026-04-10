from app.models import AudioFile, PracticeRecord


def test_audio_file_insert_and_query(db):
    audio_file = AudioFile(
        title="Sample audio",
        source_type="upload",
        storage_backend="local",
        file_path="audio/sample.mp3",
        sentences=[{"text": "Hello world", "start": 0.0, "end": 1.0, "words": []}],
    )

    db.add(audio_file)
    db.commit()

    saved = db.query(AudioFile).filter(AudioFile.id == audio_file.id).one()

    assert saved.title == "Sample audio"
    assert saved.source_type == "upload"
    assert saved.storage_backend == "local"
    assert saved.file_path == "audio/sample.mp3"
    assert saved.sentences == [{"text": "Hello world", "start": 0.0, "end": 1.0, "words": []}]
    assert saved.id is not None


def test_practice_record_insert_and_query_with_audio_file_id(db):
    audio_file = AudioFile(
        title="Lesson 1",
        source_type="url",
        storage_backend="local",
        file_path="audio/lesson-1.mp3",
        sentences=None,
    )
    db.add(audio_file)
    db.commit()

    practice_record = PracticeRecord(
        audio_file_id=audio_file.id,
        sentence_index=0,
        sentence_text="Practice this sentence",
        storage_backend="local",
        recording_path="recordings/attempt-1.webm",
        accuracy_score=91.5,
        fluency_score=88.0,
        completeness_score=100.0,
        word_scores={"Practice": 90, "this": 92, "sentence": 93},
    )

    db.add(practice_record)
    db.commit()

    saved = db.query(PracticeRecord).filter(PracticeRecord.id == practice_record.id).one()
    linked_audio = db.query(AudioFile).filter(AudioFile.id == saved.audio_file_id).one()

    assert saved.audio_file_id == audio_file.id
    assert saved.sentence_index == 0
    assert saved.sentence_text == "Practice this sentence"
    assert saved.recording_path == "recordings/attempt-1.webm"
    assert saved.accuracy_score == 91.5
    assert saved.fluency_score == 88.0
    assert saved.completeness_score == 100.0
    assert saved.word_scores == {"Practice": 90, "this": 92, "sentence": 93}
    assert linked_audio.title == "Lesson 1"
