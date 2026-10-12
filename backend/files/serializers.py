from rest_framework import serializers

from files.models import Folder
from storage_accounts.models import StorageAccount


class FileRequestSerializer(serializers.Serializer):
    storage_account = serializers.PrimaryKeyRelatedField(
        queryset=StorageAccount.objects.all()
    )
    folder = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.all(), required=False, allow_null=True
    )
    name = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=255)

    def validate_storage_account(self, storage_account):
        if storage_account.owner_id != self.context['request'].user.pk:
            raise serializers.ValidationError('Invalid storage account.')
        return storage_account

    def validate(self, attrs):
        folder = attrs.get('folder')
        if folder is not None:
            user = self.context['request'].user
            if folder.owner_id != user.pk:
                raise serializers.ValidationError({'folder': 'Invalid folder.'})
            if folder.storage_account_id != attrs['storage_account'].pk:
                raise serializers.ValidationError(
                    {'folder': 'Folder must belong to the selected storage account.'}
                )
        return attrs


class UploadURLRequestSerializer(FileRequestSerializer):
    pass


class CompleteUploadSerializer(FileRequestSerializer):
    object_key = serializers.CharField(max_length=1024)
