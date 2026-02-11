from django.contrib import admin
from .models import UserProfile, ResearchConsent, AssessmentSession, AssessmentResponse

admin.site.register(UserProfile)
admin.site.register(ResearchConsent)
admin.site.register(AssessmentSession)
admin.site.register(AssessmentResponse)
