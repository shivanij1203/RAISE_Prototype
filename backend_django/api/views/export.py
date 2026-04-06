import csv
import io

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse

from api.models import Project


@api_view(['GET'])
def project_export(request: Request, project_id: int) -> HttpResponse | Response:
    """Export a project compliance report as CSV."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        'checkpoint_id', 'label', 'category', 'assigned_to',
        'completed', 'completed_at',
        'decision_description', 'decision_notes', 'proof_type', 'proof_value', 'logged_at'
    ])

    # One row per checkpoint; decisions are repeated per checkpoint
    for cp in project.checkpoints.all().order_by('id'):
        decisions = project.decisions.filter(checkpoint=cp).order_by('logged_at')
        if decisions.exists():
            for d in decisions:
                writer.writerow([
                    cp.checkpoint_id, cp.label, cp.category, cp.assigned_to,
                    cp.completed, cp.completed_at.isoformat() if cp.completed_at else '',
                    d.description, d.notes or '', d.proof_type or '', d.proof_value or '',
                    d.logged_at.isoformat(),
                ])
        else:
            writer.writerow([
                cp.checkpoint_id, cp.label, cp.category, cp.assigned_to,
                cp.completed, cp.completed_at.isoformat() if cp.completed_at else '',
                '', '', '', '', '',
            ])

    filename = f"{project.name.replace(' ', '_')}_compliance.csv"
    response = HttpResponse(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
