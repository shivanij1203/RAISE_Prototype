from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """Extra info for users beyond Django's built-in User model."""
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('faculty', 'Faculty'),
        ('admin', 'Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.CharField(max_length=100, blank=True)
    years_in_academia = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class ResearchConsent(models.Model):
    """Track research participation consent for IRB compliance."""
    STATUS_CHOICES = [
        ('consented', 'Consented'),
        ('declined', 'Declined'),
        ('withdrawn', 'Withdrawn'),
    ]

    participant_code = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='consented')
    consent_to_data_collection = models.BooleanField(default=False)
    consent_to_longitudinal = models.BooleanField(default=False)

    # demographics (optional)
    role = models.CharField(max_length=50, blank=True)
    department_category = models.CharField(max_length=50, blank=True)

    consented_at = models.DateTimeField(auto_now_add=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.participant_code} - {self.status}"


class AssessmentSession(models.Model):
    """A single session of someone going through the ethics decision tree."""
    session_code = models.CharField(max_length=50, unique=True)
    participant = models.ForeignKey(
        ResearchConsent, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sessions'
    )

    # what they did
    initial_scenario = models.CharField(max_length=100, blank=True)
    terminal_node = models.CharField(max_length=100, blank=True)
    risk_level = models.CharField(max_length=20, blank=True)

    # timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_complete = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.session_code} - {self.initial_scenario or 'unknown'}"


class AssessmentResponse(models.Model):
    """Each individual answer within a session."""
    session = models.ForeignKey(
        AssessmentSession, on_delete=models.CASCADE, related_name='responses'
    )
    node_key = models.CharField(max_length=100)
    answer_value = models.CharField(max_length=200)
    answer_label = models.CharField(max_length=500, blank=True)
    response_order = models.IntegerField(default=0)
    responded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.session.session_code} - {self.node_key}: {self.answer_value}"


class Project(models.Model):
    """Tracks a research project and its compliance status."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    ai_use_case = models.CharField(max_length=50)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Checkpoint(models.Model):
    """Single compliance checkpoint tied to a project."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='checkpoints')
    checkpoint_id = models.CharField(max_length=50)
    label = models.CharField(max_length=200)
    category = models.CharField(max_length=50)
    assigned_to = models.CharField(max_length=20)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    what = models.TextField(blank=True)
    why = models.TextField(blank=True)
    how = models.TextField(blank=True)

    def __str__(self):
        status = 'done' if self.completed else 'pending'
        return f"{self.project.name} - {self.label} ({status})"


class Decision(models.Model):
    """Logs what was done for a checkpoint (audit trail)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='decisions')
    checkpoint = models.ForeignKey(Checkpoint, on_delete=models.CASCADE, related_name='decisions')
    description = models.CharField(max_length=500)
    notes = models.TextField(blank=True)
    proof_type = models.CharField(max_length=20, blank=True)
    proof_value = models.CharField(max_length=500, blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project.name} - {self.description[:50]}"
