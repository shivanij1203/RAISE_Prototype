from django.urls import path
from . import views

urlpatterns = [
    # Auth endpoints
    path('auth/register', views.register, name='register'),
    path('auth/login', views.login_view, name='login'),
    path('auth/logout', views.logout_view, name='logout'),
    path('auth/me', views.me, name='me'),

    # Project endpoints
    path('projects', views.project_list_create, name='project-list-create'),
    path('projects/<int:project_id>', views.project_detail, name='project-detail'),
    path('projects/<int:project_id>/checkpoints/<str:checkpoint_id>', views.checkpoint_toggle, name='checkpoint-toggle'),
    path('projects/<int:project_id>/decisions', views.decision_create, name='decision-create'),

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

    # Template/Document endpoints (primary routes)
    path('templates', views.template_list, name='template-list'),
    path('templates/<str:template_key>', views.template_detail, name='template-detail'),
    path('documents/generate', views.document_generate, name='document-generate'),

    # Template/Document aliases (frontend uses these paths)
    path('ethics/templates', views.template_list, name='template-list-alias'),
    path('ethics/templates/<str:template_key>', views.template_detail, name='template-detail-alias'),
    path('ethics/generate', views.document_generate, name='document-generate-alias'),

    # Assessment endpoints
    path('assessment/questions', views.assessment_questions, name='assessment-questions'),
    path('assessment/submit', views.assessment_submit, name='assessment-submit'),
]
