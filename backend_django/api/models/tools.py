from django.db import models
from django.contrib.auth.models import User


class AITool(models.Model):
    """Registry of AI tools used across the institution."""
    CATEGORY_CHOICES = [
        ('chatbot', 'Chatbot'),
        ('code_assistant', 'Code Assistant'),
        ('grading', 'Grading'),
        ('writing', 'Writing'),
        ('image_gen', 'Image Generation'),
        ('data_analysis', 'Data Analysis'),
        ('research', 'Research'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('under_review', 'Under Review'),
        ('not_recommended', 'Not Recommended'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    vendor = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='under_review')
    risk_notes = models.TextField(blank=True)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='added_tools')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return f"{self.name} ({self.get_status_display()})"
