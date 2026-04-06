from typing import Any

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from api.models import Project, Checkpoint, Decision, AITool, UserProfile
from api.services.checkpoint_generator import generate_checkpoints_for_use_case


def serialize_project(project: Project) -> dict[str, Any]:
    """Serialize a project with its checkpoints and decisions.

    Uses manual dict serialization to match the camelCase format
    the frontend expects. A proper DRF serializer migration is planned
    as a follow-up step.
    """
    checkpoints: list[dict[str, Any]] = []
    for cp in project.checkpoints.all().order_by('id'):
        checkpoints.append({
            'id': cp.checkpoint_id,
            'dbId': cp.id,
            'label': cp.label,
            'category': cp.category,
            'assignedTo': cp.assigned_to,
            'completed': cp.completed,
            'completedAt': cp.completed_at.isoformat() if cp.completed_at else None,
            'what': cp.what,
            'why': cp.why,
            'how': cp.how,
            'frameworks': cp.frameworks or [],
        })

    decisions: list[dict[str, Any]] = []
    for d in project.decisions.all().order_by('-logged_at'):
        decisions.append({
            'id': str(d.id),
            'checkpoint': d.checkpoint.checkpoint_id,
            'description': d.description,
            'notes': d.notes,
            'proofType': d.proof_type or None,
            'proofValue': d.proof_value or None,
            'loggedAt': d.logged_at.isoformat(),
        })

    return {
        'id': str(project.id),
        'name': project.name,
        'description': project.description,
        'aiUseCase': project.ai_use_case,
        'status': project.status,
        'createdAt': project.created_at.isoformat(),
        'checkpoints': checkpoints,
        'decisions': decisions,
        'aiTools': [
            {'id': t.id, 'name': t.name, 'status': t.status, 'category': t.category}
            for t in project.ai_tools.all()
        ],
    }


@api_view(['GET', 'POST'])
def project_list_create(request: Request) -> Response:
    """List all projects for the user, or create a new one."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        projects = Project.objects.filter(user=request.user).order_by('-created_at')
        return Response([serialize_project(p) for p in projects])

    # POST -- create
    name = request.data.get('name', '').strip()
    ai_use_case = request.data.get('ai_use_case', '')

    if not name:
        return Response({"error": "Project name is required"}, status=status.HTTP_400_BAD_REQUEST)

    project = Project.objects.create(
        user=request.user,
        name=name,
        description=request.data.get('description', ''),
        ai_use_case=ai_use_case,
    )

    # Generate checkpoints
    checkpoint_defs = generate_checkpoints_for_use_case(ai_use_case)
    for cp_def in checkpoint_defs:
        Checkpoint.objects.create(project=project, **cp_def)

    # Link AI tools if provided
    ai_tool_ids = request.data.get('ai_tool_ids', [])
    if ai_tool_ids:
        tools = AITool.objects.filter(id__in=ai_tool_ids)
        project.ai_tools.set(tools)

    return Response(serialize_project(project), status=status.HTTP_201_CREATED)


@api_view(['GET'])
def project_detail(request: Request, project_id: int) -> Response:
    """Get a single project with checkpoints and decisions."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(serialize_project(project))


@api_view(['PUT'])
def checkpoint_toggle(request: Request, project_id: int, checkpoint_id: str) -> Response:
    """Toggle a checkpoint's completed status."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        checkpoint = Checkpoint.objects.get(project=project, checkpoint_id=checkpoint_id)
    except Checkpoint.DoesNotExist:
        return Response({"error": "Checkpoint not found"}, status=status.HTTP_404_NOT_FOUND)

    checkpoint.completed = not checkpoint.completed
    checkpoint.completed_at = timezone.now() if checkpoint.completed else None
    checkpoint.save()

    return Response({
        "id": checkpoint.checkpoint_id,
        "completed": checkpoint.completed,
        "completedAt": checkpoint.completed_at.isoformat() if checkpoint.completed_at else None,
    })


@api_view(['POST'])
def decision_create(request: Request, project_id: int) -> Response:
    """Log a decision for a checkpoint."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    checkpoint_id = request.data.get('checkpoint')
    description = request.data.get('description', '').strip()

    if not checkpoint_id or not description:
        return Response(
            {"error": "checkpoint and description are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        checkpoint = Checkpoint.objects.get(project=project, checkpoint_id=checkpoint_id)
    except Checkpoint.DoesNotExist:
        return Response({"error": "Checkpoint not found"}, status=status.HTTP_404_NOT_FOUND)

    decision = Decision.objects.create(
        project=project,
        checkpoint=checkpoint,
        description=description,
        notes=request.data.get('notes', ''),
        proof_type=request.data.get('proofType', ''),
        proof_value=request.data.get('proofValue', ''),
    )

    # Auto-complete the checkpoint if not already
    if not checkpoint.completed:
        checkpoint.completed = True
        checkpoint.completed_at = timezone.now()
        checkpoint.save()

    return Response({
        'id': str(decision.id),
        'checkpoint': checkpoint.checkpoint_id,
        'description': decision.description,
        'notes': decision.notes,
        'proofType': decision.proof_type or None,
        'proofValue': decision.proof_value or None,
        'loggedAt': decision.logged_at.isoformat(),
        'checkpointCompleted': checkpoint.completed,
        'checkpointCompletedAt': checkpoint.completed_at.isoformat() if checkpoint.completed_at else None,
    }, status=status.HTTP_201_CREATED)
