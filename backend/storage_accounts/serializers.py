from rest_framework import serializers

from storage_accounts.models import StorageAccount


class StorageAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageAccount
        fields = (
            'id',
            'name',
            'provider',
            'bucket_name',
            'account_id',
            'access_key_id',
            'secret_access_key',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'account_id': {'write_only': True},
            'access_key_id': {'write_only': True},
            'secret_access_key': {'write_only': True},
        }
