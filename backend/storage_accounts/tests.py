from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from storage_accounts.models import StorageAccount


User = get_user_model()


class StorageAccountViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='owner', password='CloudKeepPass123!'
        )
        self.other_user = User.objects.create_user(
            username='other', password='CloudKeepPass123!'
        )
        self.storage_account = StorageAccount.objects.create(
            owner=self.user,
            name='Personal R2',
            account_id='account-id',
            access_key_id='access-key',
            secret_access_key='secret-key',
            bucket_name='cloudkeep-files',
        )

    def test_list_returns_only_the_authenticated_users_accounts(self):
        StorageAccount.objects.create(
            owner=self.other_user,
            name='Other R2',
            account_id='other-account-id',
            access_key_id='other-access-key',
            secret_access_key='other-secret-key',
            bucket_name='other-files',
        )
        self.client.force_authenticate(self.user)

        response = self.client.get(reverse('storage-account-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.storage_account.id)
        self.assertNotIn('account_id', response.data[0])
        self.assertNotIn('access_key_id', response.data[0])
        self.assertNotIn('secret_access_key', response.data[0])

    def test_create_sets_owner_and_hides_credentials(self):
        self.client.force_authenticate(self.user)

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
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            StorageAccount.objects.filter(owner=self.user, name='New R2').exists()
        )
        self.assertNotIn('account_id', response.data)
        self.assertNotIn('access_key_id', response.data)
        self.assertNotIn('secret_access_key', response.data)

    @patch('storage_accounts.views.get_provider')
    def test_connection_returns_success_for_a_reachable_account(self, get_provider):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            reverse(
                'storage-account-test-connection',
                kwargs={'pk': self.storage_account.pk},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        get_provider.return_value.list_objects.assert_called_once_with(prefix='')

    @patch('storage_accounts.views.get_provider')
    def test_connection_returns_safe_error_when_provider_fails(self, get_provider):
        get_provider.return_value.list_objects.side_effect = RuntimeError('secret error')
        self.client.force_authenticate(self.user)

        response = self.client.post(
            reverse(
                'storage-account-test-connection',
                kwargs={'pk': self.storage_account.pk},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('secret error', str(response.data))

# Create your tests here.
