from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

from api.models import Project, Checkpoint, CheckpointComment


@api_view(['GET', 'POST'])
def checkpoint_comments(request: Request, project_id: int, checkpoint_id: str) -> Response:
    """List or create comments on a checkpoint."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "Activity not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        checkpoint = Checkpoint.objects.get(project=project, checkpoint_id=checkpoint_id)
    except Checkpoint.DoesNotExist:
        return Response({"error": "Checkpoint not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        comments = checkpoint.comments.select_related('user').all()
        result = []
        for c in comments:
            user_role = 'unknown'
            if hasattr(c.user, 'profile'):
                user_role = c.user.profile.role
            result.append({
                'id': c.id,
                'text': c.text,
                'userName': c.user.first_name or c.user.email,
                'userRole': user_role,
                'createdAt': c.created_at.isoformat(),
            })
        return Response(result)

    # POST
    text = request.data.get('text', '').strip()
    if not text:
        return Response({"error": "Comment text is required"}, status=status.HTTP_400_BAD_REQUEST)

    comment = CheckpointComment.objects.create(
        checkpoint=checkpoint,
        user=request.user,
        text=text,
    )

    user_role = 'unknown'
    if hasattr(request.user, 'profile'):
        user_role = request.user.profile.role

    return Response({
        'id': comment.id,
        'text': comment.text,
        'userName': request.user.first_name or request.user.email,
        'userRole': user_role,
        'createdAt': comment.created_at.isoformat(),
    }, status=status.HTTP_201_CREATED)
