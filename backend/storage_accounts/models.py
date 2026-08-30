from django.db import models
from storage_accounts.fields import EncryptedTextField


class StorageAccount(models.Model):
    class Provider(models.TextChoices):
        R2 = 'r2', 'Cloudflare R2'

    owner = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='storage_accounts',
    )
    name = models.CharField(max_length=100)
    provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
        default=Provider.R2,
    )
    account_id = EncryptedTextField()
    access_key_id = EncryptedTextField()
    secret_access_key = EncryptedTextField()
    bucket_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
