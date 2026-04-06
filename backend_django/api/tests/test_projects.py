from django.test import TestCase, Client
from django.contrib.auth.models import User

from api.models import UserProfile, Project, Checkpoint


class ProjectListCreateTest(TestCase):
    """Tests for the /api/projects endpoint."""

    def setUp(self) -> None:
        self.client = Client()
        self.user = User.objects.create_user(
            username='proj@usf.edu',
            email='proj@usf.edu',
            password='testpass123',
            first_name='Project User',
        )
        UserProfile.objects.create(user=self.user, role='student')
        self.client.login(username='proj@usf.edu', password='testpass123')

    def test_create_project(self) -> None:
        response = self.client.post(
            '/api/projects',
            data={
                'name': 'Test Project',
                'ai_use_case': 'data_analysis',
                'description': 'A test project',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['name'], 'Test Project')
        self.assertTrue(len(response.json()['checkpoints']) > 0)

    def test_list_projects(self) -> None:
        Project.objects.create(
            user=self.user,
            name='Existing Project',
            ai_use_case='writing',
        )
        response = self.client.get('/api/projects')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_create_project_requires_name(self) -> None:
        response = self.client.post(
            '/api/projects',
            data={'ai_use_case': 'writing'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_unauthenticated_blocked(self) -> None:
        self.client.logout()
        response = self.client.get('/api/projects')
        self.assertEqual(response.status_code, 401)


class CheckpointToggleTest(TestCase):
    """Tests for the checkpoint toggle endpoint."""

    def setUp(self) -> None:
        self.client = Client()
        self.user = User.objects.create_user(
            username='cp@usf.edu',
            email='cp@usf.edu',
            password='testpass123',
        )
        UserProfile.objects.create(user=self.user, role='student')
        self.client.login(username='cp@usf.edu', password='testpass123')

        self.project = Project.objects.create(
            user=self.user,
            name='Toggle Test',
            ai_use_case='writing',
        )
        self.checkpoint = Checkpoint.objects.create(
            project=self.project,
            checkpoint_id='irb',
            label='IRB Status',
            category='Regulatory',
            assigned_to='pi',
        )

    def test_toggle_checkpoint(self) -> None:
        response = self.client.put(
            f'/api/projects/{self.project.id}/checkpoints/irb',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['completed'])

        # Toggle back
        response = self.client.put(
            f'/api/projects/{self.project.id}/checkpoints/irb',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['completed'])
