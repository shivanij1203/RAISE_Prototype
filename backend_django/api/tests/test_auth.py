from django.test import TestCase, Client
from django.contrib.auth.models import User

from api.models import UserProfile


class RegisterViewTest(TestCase):
    """Tests for the /api/auth/register endpoint."""

    def setUp(self) -> None:
        self.client = Client()

    def test_register_success(self) -> None:
        response = self.client.post(
            '/api/auth/register',
            data={
                'email': 'test@usf.edu',
                'password': 'securepass123',
                'full_name': 'Test User',
                'role': 'student',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='test@usf.edu').exists())

    def test_register_rejects_non_usf_email(self) -> None:
        response = self.client.post(
            '/api/auth/register',
            data={
                'email': 'test@gmail.com',
                'password': 'securepass123',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_register_rejects_short_password(self) -> None:
        response = self.client.post(
            '/api/auth/register',
            data={
                'email': 'test@usf.edu',
                'password': 'short',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


class LoginViewTest(TestCase):
    """Tests for the /api/auth/login endpoint."""

    def setUp(self) -> None:
        self.client = Client()
        self.user = User.objects.create_user(
            username='login@usf.edu',
            email='login@usf.edu',
            password='testpass123',
            first_name='Login User',
        )
        UserProfile.objects.create(user=self.user, role='student')

    def test_login_success(self) -> None:
        response = self.client.post(
            '/api/auth/login',
            data={'email': 'login@usf.edu', 'password': 'testpass123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['email'], 'login@usf.edu')

    def test_login_invalid_credentials(self) -> None:
        response = self.client.post(
            '/api/auth/login',
            data={'email': 'login@usf.edu', 'password': 'wrongpass'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)


class MeViewTest(TestCase):
    """Tests for the /api/auth/me endpoint."""

    def setUp(self) -> None:
        self.client = Client()
        self.user = User.objects.create_user(
            username='me@usf.edu',
            email='me@usf.edu',
            password='testpass123',
            first_name='Me User',
        )
        UserProfile.objects.create(user=self.user, role='faculty')

    def test_me_authenticated(self) -> None:
        self.client.login(username='me@usf.edu', password='testpass123')
        response = self.client.get('/api/auth/me')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['role'], 'faculty')

    def test_me_unauthenticated(self) -> None:
        response = self.client.get('/api/auth/me')
        self.assertEqual(response.status_code, 401)
