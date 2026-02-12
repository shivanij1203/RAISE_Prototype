from django.urls import path
from . import views

urlpatterns = [
    # Auth endpoints
    path('auth/register', views.register, name='register'),
    path('auth/login', views.login_view, name='login'),
    path('auth/logout', views.logout_view, name='logout'),
    path('auth/me', views.me, name='me'),

    # Consent endpoints
    path('research/consent', views.submit_consent, name='submit-consent'),

    # Session tracking endpoints
    path('research/session/start', views.start_session, name='start-session'),
    path('research/session/response', views.record_response, name='record-response'),
    path('research/session/complete', views.complete_session, name='complete-session'),

    # Ethics Assistant endpoints
    path('ethics/start', views.ethics_start, name='ethics-start'),
    path('ethics/node/<str:node_key>', views.ethics_node, name='ethics-node'),
    path('ethics/evaluate', views.ethics_evaluate, name='ethics-evaluate'),
    path('ethics/scenarios', views.ethics_scenarios, name='ethics-scenarios'),

    # Template/Document endpoints
    path('templates', views.template_list, name='template-list'),
    path('templates/<str:template_key>', views.template_detail, name='template-detail'),
    path('documents/generate', views.document_generate, name='document-generate'),

    # Assessment endpoints
    path('assessment/questions', views.assessment_questions, name='assessment-questions'),
    path('assessment/submit', views.assessment_submit, name='assessment-submit'),
]
