from django.db import models


class Folder(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
    )
    storage_account = models.ForeignKey(
        'storage_accounts.StorageAccount',
        on_delete=models.CASCADE,
        related_name='folders',
    )
    owner = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='folders',
    )

    def __str__(self):
        return self.name


class File(models.Model):
    name = models.CharField(max_length=255)
    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='files',
    )
    storage_account = models.ForeignKey(
        'storage_accounts.StorageAccount',
        on_delete=models.CASCADE,
        related_name='files',
    )
    owner = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='files',
    )
    object_key = models.CharField(max_length=1024)
    size_bytes = models.BigIntegerField()
    content_type = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
