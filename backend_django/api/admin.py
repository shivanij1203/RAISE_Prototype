from django.contrib import admin
from .models import (
    UserProfile, ResearchConsent, AssessmentSession, AssessmentResponse,
    Project, Checkpoint, Decision
)

admin.site.register(UserProfile)
admin.site.register(ResearchConsent)
admin.site.register(AssessmentSession)
admin.site.register(AssessmentResponse)
admin.site.register(Project)
admin.site.register(Checkpoint)
admin.site.register(Decision)
