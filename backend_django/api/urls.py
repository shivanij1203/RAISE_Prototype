from django.urls import path
from . import views

urlpatterns = [
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
