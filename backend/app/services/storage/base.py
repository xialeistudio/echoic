from abc import ABC, abstractmethod


class StorageService(ABC):
    @abstractmethod
    def save(self, data: bytes, key: str) -> str:
        """Save data and return the stored path/URL."""

    @abstractmethod
    def load(self, key: str) -> bytes:
        """Load data by key."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete data by key."""

    @abstractmethod
    def get_absolute_path(self, key: str) -> str:
        """
        Return a filesystem path that local audio processing tools can open.
        For S3, this should download to a temp file and return its path.
        """
