from django.test import TestCase, Client
from django.contrib.auth.models import User

from api.models import UserProfile, AITool


class AIToolListCreateTest(TestCase):
    """Tests for the /api/tools endpoint."""

    def setUp(self) -> None:
        self.client = Client()
        self.faculty = User.objects.create_user(
            username='faculty@usf.edu',
            email='faculty@usf.edu',
            password='testpass123',
            first_name='Faculty User',
        )
        UserProfile.objects.create(user=self.faculty, role='faculty')

        self.student = User.objects.create_user(
            username='student@usf.edu',
            email='student@usf.edu',
            password='testpass123',
            first_name='Student User',
        )
        UserProfile.objects.create(user=self.student, role='student')

    def test_list_tools(self) -> None:
        AITool.objects.create(
            name='ChatGPT',
            category='chatbot',
            status='approved',
            added_by=self.faculty,
        )
        self.client.login(username='faculty@usf.edu', password='testpass123')
        response = self.client.get('/api/tools')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_faculty_can_create_tool(self) -> None:
        self.client.login(username='faculty@usf.edu', password='testpass123')
        response = self.client.post(
            '/api/tools',
            data={
                'name': 'New Tool',
                'category': 'writing',
                'description': 'A writing tool',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['name'], 'New Tool')

    def test_student_cannot_create_tool(self) -> None:
        self.client.login(username='student@usf.edu', password='testpass123')
        response = self.client.post(
            '/api/tools',
            data={
                'name': 'Blocked Tool',
                'category': 'chatbot',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_blocked(self) -> None:
        response = self.client.get('/api/tools')
        self.assertEqual(response.status_code, 401)
