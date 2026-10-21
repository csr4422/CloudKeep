from rest_framework import serializers

from files.models import File, Folder
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


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ('id', 'name', 'parent', 'storage_account', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate_storage_account(self, storage_account):
        if storage_account.owner_id != self.context['request'].user.pk:
            raise serializers.ValidationError('Invalid storage account.')
        return storage_account

    def validate(self, attrs):
        instance = self.instance
        storage_account = attrs.get(
            'storage_account', instance.storage_account if instance else None
        )
        parent = attrs.get('parent', instance.parent if instance else None)
        user = self.context['request'].user

        if parent is not None:
            if parent.owner_id != user.pk:
                raise serializers.ValidationError({'parent': 'Invalid parent folder.'})
            if storage_account is not None and parent.storage_account_id != storage_account.pk:
                raise serializers.ValidationError(
                    {'parent': 'Parent must belong to the same storage account.'}
                )
            ancestor = parent
            while ancestor is not None:
                if instance is not None and ancestor.pk == instance.pk:
                    raise serializers.ValidationError(
                        {'parent': 'A folder cannot be moved under itself or its descendant.'}
                    )
                ancestor = ancestor.parent

        return attrs


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = (
            'id', 'name', 'folder', 'storage_account', 'size_bytes',
            'content_type', 'uploaded_at',
        )
        read_only_fields = (
            'id', 'storage_account', 'size_bytes', 'content_type', 'uploaded_at',
        )

    def to_internal_value(self, data):
        unsupported_fields = set(data) - {'name', 'folder'}
        if unsupported_fields:
            raise serializers.ValidationError(
                {
                    field: 'This field is not editable.'
                    for field in sorted(unsupported_fields)
                }
            )
        return super().to_internal_value(data)

    def validate_folder(self, folder):
        if folder is None:
            return folder
        if folder.owner_id != self.context['request'].user.pk:
            raise serializers.ValidationError('Invalid folder.')
        if self.instance is not None and folder.storage_account_id != self.instance.storage_account_id:
            raise serializers.ValidationError(
                'Folder must belong to the file storage account.'
            )
        return folder
