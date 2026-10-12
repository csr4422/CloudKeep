import logging
from uuid import uuid4

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from files.models import File
from files.serializers import CompleteUploadSerializer, UploadURLRequestSerializer
from storage_accounts.providers.factory import get_provider


logger = logging.getLogger(__name__)
URL_EXPIRATION_SECONDS = 3600


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
