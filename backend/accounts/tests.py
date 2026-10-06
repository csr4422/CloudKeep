from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase


User = get_user_model()


class AuthenticationEndpointTests(APITestCase):
    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': 'alex',
                'email': 'alex@example.com',
                'password': 'CloudKeepPass123!',
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='alex').exists())
        self.assertEqual(response.data['user']['username'], 'alex')
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_and_refresh_return_tokens(self):
        User.objects.create_user(username='alex', password='CloudKeepPass123!')

        login_response = self.client.post(
            reverse('login'),
            {'username': 'alex', 'password': 'CloudKeepPass123!'},
        )

        self.assertEqual(login_response.status_code, 200)
        refresh_response = self.client.post(
            reverse('token-refresh'),
            {'refresh': login_response.data['refresh']},
        )
        self.assertEqual(refresh_response.status_code, 200)
        self.assertIn('access', refresh_response.data)
