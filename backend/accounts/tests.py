from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


User = get_user_model()


class AuthenticationEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_returns_tokens_without_password(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': 'alex',
                'email': 'alex@example.com',
                'password': 'CloudKeepPass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='alex').exists())
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotIn('password', response.data)
        self.assertNotIn('password', response.data['user'])

    def test_login_succeeds(self):
        User.objects.create_user(username='alex', password='CloudKeepPass123!')

        response = self.client.post(
            reverse('login'),
            {'username': 'alex', 'password': 'CloudKeepPass123!'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_with_wrong_password_returns_unauthorized(self):
        User.objects.create_user(username='alex', password='CloudKeepPass123!')

        response = self.client.post(
            reverse('login'),
            {'username': 'alex', 'password': 'wrong-password'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
