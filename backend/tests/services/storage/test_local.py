from app.config import StorageConfig
from app.services.storage.local import LocalStorageService


def test_local_storage_service_round_trip(tmp_storage):
    service = LocalStorageService(StorageConfig(local_dir=str(tmp_storage)))
    key = "audio/test.mp3"
    data = b"test audio bytes"

    saved_key = service.save(data, key)

    assert saved_key == key
    assert service.load(key) == data
    assert service.get_absolute_path(key) == str((tmp_storage / key).resolve())

    service.delete(key)

    assert not (tmp_storage / key).exists()

    import pytest
    with pytest.raises(FileNotFoundError):
        service.load(key)
