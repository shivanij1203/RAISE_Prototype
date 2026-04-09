from django.db import models
from django.contrib.auth.models import User


class AITool(models.Model):
    """Registry of AI and productivity tools used across the institution."""
    TOOL_TYPE_CHOICES = [
        ('ai', 'AI Tool'),
        ('general', 'Productivity & Research'),
    ]
    CATEGORY_CHOICES = [
        ('chatbot', 'Chatbot'),
        ('code_assistant', 'Code Assistant'),
        ('grading', 'Grading'),
        ('writing', 'Writing'),
        ('image_gen', 'Image Generation'),
        ('data_analysis', 'Data Analysis'),
        ('research', 'Research'),
        ('survey', 'Survey & Forms'),
        ('statistics', 'Statistics'),
        ('qualitative', 'Qualitative Analysis'),
        ('reference', 'Reference Management'),
        ('collaboration', 'Collaboration'),
        ('lms', 'Learning Management'),
        ('visualization', 'Data Visualization'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('under_review', 'Under Review'),
        ('not_recommended', 'Not Recommended'),
    ]

    tool_type = models.CharField(max_length=10, choices=TOOL_TYPE_CHOICES, default='ai')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    vendor = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='under_review')
    risk_notes = models.TextField(blank=True)
    website_url = models.URLField(blank=True, help_text='Link to the tool website')
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='added_tools')
    created_at = models.DateTimeField(auto_now_add=True)

    # Data handling fields
    retains_data = models.BooleanField(default=True, help_text='Does the tool retain user data?')
    data_retention_details = models.TextField(blank=True, help_text='How long is data retained and where?')
    sends_to_third_party = models.BooleanField(default=True, help_text='Does data leave the institution?')
    hipaa_compliant = models.BooleanField(default=False)
    ferpa_compliant = models.BooleanField(default=False)
    has_enterprise_plan = models.BooleanField(default=False, help_text='Does it offer an institutional plan with better data controls?')

    # Compliance guidance per use case (JSON: { "grading": "...", "research": "...", ... })
    compliance_guidance = models.JSONField(default=dict, blank=True,
        help_text='How to use this tool compliantly for each use case')
    recommended_use_cases = models.JSONField(default=list, blank=True,
        help_text='List of use case keys this tool is suitable for')

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return f"{self.name} ({self.get_tool_type_display()})"
