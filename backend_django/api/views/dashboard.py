from typing import Any

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count

from django.db.models import Q

from api.models import Project, Decision, AITool, UserProfile


@api_view(['GET'])
def dashboard_stats(request: Request) -> Response:
    """Personalized dashboard stats filtered by role and scope."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    profile, _ = UserProfile.objects.get_or_create(user=request.user, defaults={'role': 'student'})
    scope = request.query_params.get('scope', 'mine')

    # Students see own + where they're involved. Faculty can toggle scope.
    if profile.role == 'student' or scope == 'mine':
        projects_qs = Project.objects.filter(
            Q(user=request.user) | Q(faculty_advisor=request.user)
        ).distinct()
        decisions_qs = Decision.objects.filter(
            Q(project__user=request.user) | Q(project__faculty_advisor=request.user)
        ).distinct()
    else:
        projects_qs = Project.objects.all()
        decisions_qs = Decision.objects.all()

    projects_qs = projects_qs.select_related('user').prefetch_related('checkpoints', 'decisions')
    total_activities = projects_qs.count()

    activities: list[dict[str, Any]] = []
    risk_counts: dict[str, int] = {'high': 0, 'medium': 0, 'low': 0}
    total_compliance = 0

    critical_ids = {
        'irb', 'data_deidentified', 'participant_consent',
        'ferpa_compliance', 'grading_fairness', 'decision_impact',
    }
    medium_ids = {
        'bias_audit', 'human_review', 'ai_disclosure',
        'human_override', 'admin_bias_audit', 'content_accuracy',
    }

    for p in projects_qs:
        cps = list(p.checkpoints.all())
        total_cp = len(cps)
        done_cp = sum(1 for c in cps if c.completed)
        pct = round((done_cp / total_cp) * 100) if total_cp > 0 else 0
        total_compliance += pct

        incomplete_critical = [c for c in cps if not c.completed and c.checkpoint_id in critical_ids]
        incomplete_medium = [c for c in cps if not c.completed and c.checkpoint_id in medium_ids]

        if incomplete_critical:
            risk = 'high'
        elif incomplete_medium or pct < 50:
            risk = 'medium'
        else:
            risk = 'low'

        risk_counts[risk] += 1

        activities.append({
            'id': str(p.id),
            'name': p.name,
            'owner': p.user.first_name or p.user.email,
            'aiUseCase': p.ai_use_case,
            'compliancePct': pct,
            'risk': risk,
            'createdAt': p.created_at.isoformat(),
            'checkpointsDone': done_cp,
            'checkpointsTotal': total_cp,
        })

    avg_compliance = round(total_compliance / total_activities) if total_activities > 0 else 0

    recent_decisions = decisions_qs.select_related('project', 'checkpoint').order_by('-logged_at')[:10]
    recent_feed = [{
        'activityName': d.project.name,
        'checkpoint': d.checkpoint.label,
        'description': d.description,
        'loggedAt': d.logged_at.isoformat(),
        'owner': d.project.user.first_name or d.project.user.email,
    } for d in recent_decisions]

    # Tool stats
    tool_stats: dict[str, Any] = {
        'total': AITool.objects.count(),
        'byStatus': {
            'approved': AITool.objects.filter(status='approved').count(),
            'under_review': AITool.objects.filter(status='under_review').count(),
            'not_recommended': AITool.objects.filter(status='not_recommended').count(),
        },
        'mostUsed': [
            {'id': t.id, 'name': t.name, 'category': t.category, 'count': t.usage_count}
            for t in AITool.objects.annotate(
                usage_count=Count('projects')
            ).filter(usage_count__gt=0).order_by('-usage_count')[:5]
        ],
    }

    return Response({
        'totalActivities': total_activities,
        'avgCompliance': avg_compliance,
        'riskBreakdown': risk_counts,
        'recentFeed': recent_feed,
        'activities': sorted(activities, key=lambda a: a['createdAt'], reverse=True),
        'toolStats': tool_stats,
        'scope': scope,
        'userRole': profile.role,
        'userName': request.user.first_name or request.user.email,
    })
