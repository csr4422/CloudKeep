import logging
from uuid import uuid4

from django.db import transaction
from rest_framework import filters, mixins, permissions, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from files.models import File, Folder
from files.serializers import (
    CompleteUploadSerializer,
    FileSerializer,
    FolderSerializer,
    UploadURLRequestSerializer,
)
from storage_accounts.providers.factory import get_provider


logger = logging.getLogger(__name__)
URL_EXPIRATION_SECONDS = 3600


class FilePagination(PageNumberPagination):
    page_size = 50


class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = Folder.objects.filter(owner=self.request.user).select_related(
            'parent', 'storage_account'
        )
        storage_account = self.request.query_params.get('storage_account')
        parent = self.request.query_params.get('parent')
        if storage_account is not None:
            queryset = queryset.filter(storage_account_id=storage_account)
        if parent == 'root':
            queryset = queryset.filter(parent__isnull=True)
        elif parent is not None:
            queryset = queryset.filter(parent_id=parent)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        folder = self.get_object()
        folders = [folder]
        descendant_ids = {folder.pk}
        offset = 0
        while offset < len(folders):
            current = folders[offset]
            offset += 1
            children = list(
                Folder.objects.filter(
                    owner=request.user, storage_account_id=folder.storage_account_id,
                    parent_id=current.pk,
                )
            )
            folders.extend(child for child in children if child.pk not in descendant_ids)
            descendant_ids.update(child.pk for child in children)

        files = list(
            File.objects.filter(
                owner=request.user, folder_id__in=descendant_ids
            ).select_related('storage_account')
        )
        try:
            for file in files:
                get_provider(file.storage_account).delete_object(file.object_key)
        except Exception:
            logger.warning(
                'Folder object deletion failed for folder %s', folder.pk, exc_info=True
            )
            return Response(
                {'detail': 'Unable to delete folder contents.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FileViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = FileSerializer
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = FilePagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('name',)
    ordering_fields = ('name', 'size_bytes', 'uploaded_at')
    http_method_names = ('get', 'patch', 'delete', 'head', 'options')

    def get_queryset(self):
        queryset = File.objects.filter(owner=self.request.user).select_related(
            'folder', 'storage_account'
        )
        storage_account = self.request.query_params.get('storage_account')
        folder = self.request.query_params.get('folder')
        if storage_account is not None:
            queryset = queryset.filter(storage_account_id=storage_account)
        if folder == 'root':
            queryset = queryset.filter(folder__isnull=True)
        elif folder is not None:
            queryset = queryset.filter(folder_id=folder)
        return queryset

    def partial_update(self, request, *args, **kwargs):
        # Keep PATCH limited to the two mutable fields, even if a client sends extra data.
        serializer = self.get_serializer(
            self.get_object(), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        file = self.get_object()
        try:
            get_provider(file.storage_account).delete_object(file.object_key)
        except Exception:
            logger.warning('File object deletion failed for file %s', file.pk, exc_info=True)
            return Response(
                {'detail': 'Unable to delete file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UploadURLView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = UploadURLRequestSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        object_key = f'{request.user.pk}/{uuid4()}/{data["name"]}'

        try:
            upload_url = get_provider(data['storage_account']).generate_presigned_upload_url(
                object_key, data['content_type'], URL_EXPIRATION_SECONDS
            )
        except Exception:
            logger.warning(
                'Presigned upload URL generation failed for user %s',
                request.user.pk,
                exc_info=True,
            )
            return Response(
                {'detail': 'Unable to generate an upload URL.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                'upload_url': upload_url,
                'object_key': object_key,
                'content_type': data['content_type'],
                'expires_in': URL_EXPIRATION_SECONDS,
            }
        )


class CompleteUploadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = CompleteUploadSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not data['object_key'].startswith(f'{request.user.pk}/'):
            return Response(
                {'detail': 'Invalid object key.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            metadata = get_provider(data['storage_account']).head_object(data['object_key'])
        except Exception:
            logger.warning(
                'Upload completion failed for user %s', request.user.pk, exc_info=True
            )
            return Response(
                {'detail': 'Unable to verify the uploaded file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = File.objects.create(
            owner=request.user,
            storage_account=data['storage_account'],
            folder=data.get('folder'),
            name=data['name'],
            object_key=data['object_key'],
            size_bytes=metadata['size'],
            content_type=metadata['content_type'] or data['content_type'],
        )
        return Response(
            {
                'id': file.pk,
                'name': file.name,
                'folder': file.folder_id,
                'object_key': file.object_key,
                'size_bytes': file.size_bytes,
                'content_type': file.content_type,
                'uploaded_at': file.uploaded_at,
            },
            status=status.HTTP_201_CREATED,
        )


class DownloadURLView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, pk):
        file = (
            File.objects.filter(owner=request.user)
            .select_related('storage_account')
            .filter(pk=pk)
            .first()
        )
        if file is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            download_url = get_provider(file.storage_account).generate_presigned_download_url(
                file.object_key, URL_EXPIRATION_SECONDS
            )
        except Exception:
            logger.warning(
                'Presigned download URL generation failed for file %s',
                file.pk,
                exc_info=True,
            )
            return Response(
                {'detail': 'Unable to generate a download URL.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {'download_url': download_url, 'expires_in': URL_EXPIRATION_SECONDS}
        )
