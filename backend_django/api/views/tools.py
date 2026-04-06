from typing import Any

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

from api.models import AITool, UserProfile


def serialize_ai_tool(tool: AITool) -> dict[str, Any]:
    """Serialize an AITool instance to a camelCase dict for the frontend."""
    return {
        'id': tool.id,
        'name': tool.name,
        'description': tool.description,
        'vendor': tool.vendor,
        'category': tool.category,
        'categoryDisplay': tool.get_category_display(),
        'status': tool.status,
        'statusDisplay': tool.get_status_display(),
        'riskNotes': tool.risk_notes,
        'addedBy': tool.added_by.first_name or tool.added_by.email if tool.added_by else None,
        'createdAt': tool.created_at.isoformat(),
        'projectCount': tool.projects.count(),
    }


@api_view(['GET', 'POST'])
def ai_tool_list_create(request: Request) -> Response:
    """List all AI tools, or create a new one (faculty only)."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        tools = AITool.objects.all()
        category = request.query_params.get('category')
        tool_status = request.query_params.get('status')
        search = request.query_params.get('search', '').strip()
        if category:
            tools = tools.filter(category=category)
        if tool_status:
            tools = tools.filter(status=tool_status)
        if search:
            tools = tools.filter(name__icontains=search)
        return Response([serialize_ai_tool(t) for t in tools])

    # POST -- faculty only
    profile, _ = UserProfile.objects.get_or_create(user=request.user, defaults={'role': 'student'})
    if profile.role != 'faculty':
        return Response({"error": "Only faculty can add tools"}, status=status.HTTP_403_FORBIDDEN)

    name = request.data.get('name', '').strip()
    category = request.data.get('category', '')
    if not name or not category:
        return Response({"error": "Name and category are required"}, status=status.HTTP_400_BAD_REQUEST)

    tool = AITool.objects.create(
        name=name,
        description=request.data.get('description', ''),
        vendor=request.data.get('vendor', ''),
        category=category,
        status=request.data.get('status', 'under_review'),
        risk_notes=request.data.get('risk_notes', ''),
        added_by=request.user,
    )
    return Response(serialize_ai_tool(tool), status=status.HTTP_201_CREATED)


@api_view(['PUT'])
def ai_tool_update(request: Request, tool_id: int) -> Response:
    """Update an existing AI tool (faculty only)."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    profile, _ = UserProfile.objects.get_or_create(user=request.user, defaults={'role': 'student'})
    if profile.role != 'faculty':
        return Response({"error": "Only faculty can update tools"}, status=status.HTTP_403_FORBIDDEN)

    try:
        tool = AITool.objects.get(id=tool_id)
    except AITool.DoesNotExist:
        return Response({"error": "Tool not found"}, status=status.HTTP_404_NOT_FOUND)

    for field in ['name', 'description', 'vendor', 'category', 'status', 'risk_notes']:
        if field in request.data:
            setattr(tool, field, request.data[field])
    tool.save()

    return Response(serialize_ai_tool(tool))
