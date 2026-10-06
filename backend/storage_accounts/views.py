import logging

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from storage_accounts.models import StorageAccount
from storage_accounts.providers.factory import get_provider
from storage_accounts.serializers import StorageAccountSerializer


logger = logging.getLogger(__name__)


class StorageAccountViewSet(viewsets.ModelViewSet):
    serializer_class = StorageAccountSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return StorageAccount.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        storage_account = self.get_object()

        try:
            get_provider(storage_account).list_objects(prefix='')
        except Exception:
            logger.warning(
                'Storage account connection test failed for account %s',
                storage_account.pk,
                exc_info=True,
            )
            return Response(
                {'detail': 'Unable to connect to the storage account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({'detail': 'Storage account connection succeeded.'})
