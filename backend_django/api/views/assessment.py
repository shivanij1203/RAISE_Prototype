from typing import Any

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from api.services.assessment_data import (
    get_questions,
    get_categories,
    calculate_results,
)


@api_view(['GET'])
def assessment_questions(request: Request) -> Response:
    """Get all assessment questions."""
    return Response({
        "questions": get_questions(),
        "categories": get_categories()
    })


@api_view(['POST'])
def assessment_submit(request: Request) -> Response:
    """Submit assessment answers and get results."""
    answers: dict[str, Any] = request.data.get('answers', {})
    results = calculate_results(answers)
    return Response(results)
