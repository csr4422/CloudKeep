from abc import ABC, abstractmethod


class StorageProvider(ABC):
    @abstractmethod
    def generate_presigned_upload_url(self, object_key, content_type, expires_in):
        """Return a presigned URL for uploading an object."""

    @abstractmethod
    def generate_presigned_download_url(self, object_key, expires_in):
        """Return a presigned URL for downloading an object."""

    @abstractmethod
    def list_objects(self, prefix):
        """Return objects whose keys begin with prefix."""

    @abstractmethod
    def delete_object(self, object_key):
        """Delete an object by key."""

    @abstractmethod
    def get_usage(self):
        """Return the total number of bytes stored."""
