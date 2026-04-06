from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """Extra info for users beyond Django's built-in User model."""
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('faculty', 'Faculty'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.CharField(max_length=100, blank=True)
    years_in_academia = models.IntegerField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"
