from unittest.mock import call, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from files.models import File, Folder
from storage_accounts.models import StorageAccount


User = get_user_model()


class FilesAPITests(TestCase):
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
        self.other_storage_account = StorageAccount.objects.create(
            owner=self.other_user,
            name='Other R2',
            account_id='other-account-id',
            access_key_id='other-access-key',
            secret_access_key='other-secret-key',
            bucket_name='other-files',
        )

    def authenticate_as(self, user):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(user)}'
        )

    def create_file(self, *, owner=None, storage_account=None, folder=None, **overrides):
        owner = owner or self.user
        storage_account = storage_account or (
            self.storage_account if owner == self.user else self.other_storage_account
        )
        defaults = {
            'name': 'document.txt',
            'owner': owner,
            'storage_account': storage_account,
            'folder': folder,
            'object_key': f'{owner.pk}/object/document.txt',
            'size_bytes': 42,
            'content_type': 'text/plain',
        }
        defaults.update(overrides)
        return File.objects.create(**defaults)

    def test_upload_url_uses_user_prefix_and_creates_no_file_row(self):
        with patch('files.views.get_provider') as get_provider:
            get_provider.return_value.generate_presigned_upload_url.return_value = 'https://upload'
            response = self.client.post(
                reverse('file-upload-url'),
                {
                    'storage_account': self.storage_account.pk,
                    'name': 'report.csv',
                    'content_type': 'text/csv',
                },
                format='json',
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['object_key'].startswith(f'{self.user.pk}/'))
        self.assertEqual(File.objects.count(), 0)

    @patch('files.views.get_provider')
    def test_upload_url_rejects_another_users_storage_account(self, get_provider):
        response = self.client.post(
            reverse('file-upload-url'),
            {
                'storage_account': self.other_storage_account.pk,
                'name': 'report.csv',
                'content_type': 'text/csv',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        get_provider.assert_not_called()
        self.assertEqual(File.objects.count(), 0)

    def test_complete_rejects_another_users_key_prefix(self):
        response = self.client.post(
            reverse('file-complete-upload'),
            {
                'storage_account': self.storage_account.pk,
                'name': 'stolen.txt',
                'content_type': 'text/plain',
                'object_key': f'{self.other_user.pk}/object/stolen.txt',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(File.objects.count(), 0)

    @patch('files.views.get_provider')
    def test_complete_provider_failure_returns_400_without_creating_row(self, get_provider):
        get_provider.return_value.head_object.side_effect = RuntimeError('secret error')

        response = self.client.post(
            reverse('file-complete-upload'),
            {
                'storage_account': self.storage_account.pk,
                'name': 'report.txt',
                'content_type': 'text/plain',
                'object_key': f'{self.user.pk}/object/report.txt',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('secret error', str(response.data))
        self.assertEqual(File.objects.count(), 0)

    @patch('files.views.get_provider')
    def test_complete_uses_size_from_head_object(self, get_provider):
        get_provider.return_value.head_object.return_value = {
            'size': 8192,
            'content_type': 'text/plain',
        }

        response = self.client.post(
            reverse('file-complete-upload'),
            {
                'storage_account': self.storage_account.pk,
                'name': 'report.txt',
                'content_type': 'text/plain',
                'object_key': f'{self.user.pk}/object/report.txt',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        file = File.objects.get(pk=response.data['id'])
        self.assertEqual(file.size_bytes, 8192)
        self.assertEqual(response.data['size_bytes'], 8192)

    @patch('files.views.get_provider')
    def test_download_url_is_available_to_owner(self, get_provider):
        file = self.create_file()
        get_provider.return_value.generate_presigned_download_url.return_value = 'https://download'

        response = self.client.get(
            reverse('file-download-url', kwargs={'pk': file.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['download_url'], 'https://download')

    @patch('files.views.get_provider')
    def test_other_user_cannot_get_download_url(self, get_provider):
        file = self.create_file()
        self.authenticate_as(self.other_user)

        response = self.client.get(
            reverse('file-download-url', kwargs={'pk': file.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        get_provider.assert_not_called()

    def test_folder_cannot_be_moved_under_itself_or_its_descendant(self):
        parent = Folder.objects.create(
            owner=self.user, storage_account=self.storage_account, name='parent'
        )
        child = Folder.objects.create(
            owner=self.user,
            storage_account=self.storage_account,
            name='child',
            parent=parent,
        )

        self_parent_response = self.client.patch(
            reverse('folder-detail', kwargs={'pk': parent.pk}),
            {'parent': parent.pk},
            format='json',
        )
        descendant_response = self.client.patch(
            reverse('folder-detail', kwargs={'pk': parent.pk}),
            {'parent': child.pk},
            format='json',
        )

        self.assertEqual(self_parent_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(descendant_response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('files.views.get_provider')
    def test_folder_delete_removes_objects_in_folder_and_descendants(
        self, get_provider
    ):
        folder = Folder.objects.create(
            owner=self.user, storage_account=self.storage_account, name='parent'
        )
        child = Folder.objects.create(
            owner=self.user,
            storage_account=self.storage_account,
            name='child',
            parent=folder,
        )
        direct_file = self.create_file(folder=folder, object_key='direct-key')
        nested_file = self.create_file(
            folder=child, name='nested.txt', object_key='nested-key'
        )

        response = self.client.delete(reverse('folder-detail', kwargs={'pk': folder.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        get_provider.assert_called()
        get_provider.return_value.delete_object.assert_has_calls(
            [call('direct-key'), call('nested-key')], any_order=True
        )
        self.assertFalse(File.objects.filter(pk__in=[direct_file.pk, nested_file.pk]).exists())
        self.assertFalse(Folder.objects.filter(pk__in=[folder.pk, child.pk]).exists())

    @patch('files.views.get_provider')
    def test_folder_delete_failure_keeps_all_rows(self, get_provider):
        folder = Folder.objects.create(
            owner=self.user, storage_account=self.storage_account, name='folder'
        )
        file = self.create_file(folder=folder)
        get_provider.return_value.delete_object.side_effect = RuntimeError('storage failure')

        response = self.client.delete(reverse('folder-detail', kwargs={'pk': folder.pk}))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Folder.objects.filter(pk=folder.pk).exists())
        self.assertTrue(File.objects.filter(pk=file.pk).exists())

    def test_file_list_is_scoped_to_user(self):
        own_file = self.create_file()
        self.create_file(owner=self.other_user)

        response = self.client.get(reverse('file-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data['results']], [own_file.pk])

    def test_file_search_and_folder_root_filters(self):
        root_match = self.create_file(name='Needle report.txt', object_key='root-match')
        self.create_file(name='Other report.txt', object_key='root-other')
        folder = Folder.objects.create(
            owner=self.user, storage_account=self.storage_account, name='folder'
        )
        self.create_file(
            name='Needle nested.txt', folder=folder, object_key='nested-match'
        )

        response = self.client.get(
            reverse('file-list'), {'search': 'needle', 'folder': 'root'}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data['results']], [root_match.pk])

    def test_file_patch_rejects_object_key(self):
        file = self.create_file(object_key='original-key')
        original_name = file.name

        response = self.client.patch(
            reverse('file-detail', kwargs={'pk': file.pk}),
            {'name': 'renamed.txt', 'object_key': 'replacement-key'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('object_key', response.data)
        file.refresh_from_db()
        self.assertEqual(file.name, original_name)
        self.assertEqual(file.object_key, 'original-key')

    def test_file_patch_updates_name(self):
        file = self.create_file()

        response = self.client.patch(
            reverse('file-detail', kwargs={'pk': file.pk}),
            {'name': 'renamed.txt'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        file.refresh_from_db()
        self.assertEqual(file.name, 'renamed.txt')

    @patch('files.views.get_provider')
    def test_file_destroy_deletes_storage_object_before_row(self, get_provider):
        file = self.create_file(object_key='delete-me')

        def assert_row_exists_when_deleting(object_key):
            self.assertEqual(object_key, 'delete-me')
            self.assertTrue(File.objects.filter(pk=file.pk).exists())

        get_provider.return_value.delete_object.side_effect = assert_row_exists_when_deleting

        response = self.client.delete(reverse('file-detail', kwargs={'pk': file.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(File.objects.filter(pk=file.pk).exists())

    def test_protected_endpoints_return_401_without_token(self):
        folder = Folder.objects.create(
            owner=self.user, storage_account=self.storage_account, name='folder'
        )
        file = self.create_file(folder=folder)
        self.client.credentials()
        folder_detail = reverse('folder-detail', kwargs={'pk': folder.pk})
        file_detail = reverse('file-detail', kwargs={'pk': file.pk})
        urls_and_methods = (
            (reverse('file-upload-url'), 'post'),
            (reverse('file-complete-upload'), 'post'),
            (reverse('file-download-url', kwargs={'pk': file.pk}), 'get'),
            (reverse('folder-list'), 'get'),
            (reverse('folder-list'), 'post'),
            (folder_detail, 'get'),
            (folder_detail, 'patch'),
            (folder_detail, 'delete'),
            (reverse('file-list'), 'get'),
            (file_detail, 'get'),
            (file_detail, 'patch'),
            (file_detail, 'delete'),
        )
        for url, method in urls_and_methods:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, {}, format='json')
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
