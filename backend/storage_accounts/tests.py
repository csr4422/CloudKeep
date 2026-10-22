from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from storage_accounts.models import StorageAccount


User = get_user_model()


class StorageAccountViewSetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='owner', password='CloudKeepPass123!'
        )
        self.other_user = User.objects.create_user(
            username='other', password='CloudKeepPass123!'
        )
        self.client = APIClient()
        self.authenticate_as(self.user)
        self.storage_account = StorageAccount.objects.create(
            owner=self.user,
            name='Personal R2',
            account_id='account-id',
            access_key_id='access-key',
            secret_access_key='secret-key',
            bucket_name='cloudkeep-files',
        )

    def authenticate_as(self, user):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(user)}'
        )

    def test_create_returns_no_credential_fields(self):
        response = self.client.post(
            reverse('storage-account-list'),
            {
                'name': 'New R2',
                'provider': 'r2',
                'account_id': 'new-account-id',
                'access_key_id': 'new-access-key',
                'secret_access_key': 'new-secret-key',
                'bucket_name': 'new-files',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('account_id', response.data)
        self.assertNotIn('endpoint_url', response.data)
        self.assertNotIn('access_key_id', response.data)
        self.assertNotIn('secret_access_key', response.data)

    def test_list_is_scoped_to_requesting_user(self):
        other_account = StorageAccount.objects.create(
            owner=self.other_user,
            name='Other R2',
            account_id='other-account-id',
            access_key_id='other-access-key',
            secret_access_key='other-secret-key',
            bucket_name='other-files',
        )

        response = self.client.get(reverse('storage-account-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([account['id'] for account in response.data], [self.storage_account.pk])
        self.assertNotIn(other_account.pk, [account['id'] for account in response.data])

    def test_other_user_gets_404_for_account_detail(self):
        self.authenticate_as(self.other_user)

        response = self.client.get(
            reverse('storage-account-detail', kwargs={'pk': self.storage_account.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('storage_accounts.views.get_provider')
    def test_connection_returns_success_when_provider_succeeds(self, get_provider):
        response = self.client.post(
            reverse(
                'storage-account-test-connection',
                kwargs={'pk': self.storage_account.pk},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        get_provider.return_value.list_objects.assert_called_once_with(prefix='')

    @patch('storage_accounts.views.get_provider')
    def test_connection_returns_generic_error_when_provider_fails(self, get_provider):
        get_provider.return_value.list_objects.side_effect = RuntimeError('secret error')

        response = self.client.post(
            reverse(
                'storage-account-test-connection',
                kwargs={'pk': self.storage_account.pk},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('secret error', str(response.data))

    def test_protected_endpoints_return_401_without_token(self):
        self.client.credentials()
        urls_and_methods = (
            (reverse('storage-account-list'), 'get'),
            (reverse('storage-account-list'), 'post'),
            (reverse('storage-account-detail', kwargs={'pk': self.storage_account.pk}), 'get'),
            (reverse('storage-account-detail', kwargs={'pk': self.storage_account.pk}), 'patch'),
            (reverse('storage-account-detail', kwargs={'pk': self.storage_account.pk}), 'delete'),
            (reverse('storage-account-test-connection', kwargs={'pk': self.storage_account.pk}), 'post'),
        )
        for url, method in urls_and_methods:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, {}, format='json')
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
