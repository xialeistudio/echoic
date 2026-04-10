from pathlib import Path

from app.config import StorageConfig
from app.services.storage.base import StorageService


class LocalStorageService(StorageService):
    def __init__(self, config: StorageConfig):
        self.base_dir = Path(config.local_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _path_for_key(self, key: str) -> Path:
        return self.base_dir / key

    def save(self, data: bytes, key: str) -> str:
        path = self._path_for_key(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def load(self, key: str) -> bytes:
        return self._path_for_key(key).read_bytes()

    def delete(self, key: str) -> None:
        self._path_for_key(key).unlink()

    def get_absolute_path(self, key: str) -> str:
        return str(self._path_for_key(key).resolve())
