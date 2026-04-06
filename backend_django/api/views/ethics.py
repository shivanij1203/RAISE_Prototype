from typing import Any

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

from api.services.ethics_engine import (
    get_decision_node,
    process_decision_path,
    RESEARCH_SCENARIOS,
)


@api_view(['GET'])
def ethics_start(request: Request) -> Response:
    """Get the starting node of the decision tree."""
    node = get_decision_node("start")
    return Response({"key": "start", **node})


@api_view(['GET'])
def ethics_node(request: Request, node_key: str) -> Response:
    """Get a specific node in the decision tree."""
    node = get_decision_node(node_key)
    if not node:
        return Response(
            {"error": "Node not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    return Response({"key": node_key, **node})


@api_view(['POST'])
def ethics_evaluate(request: Request) -> Response:
    """Evaluate the complete decision path and return results."""
    answers: dict[str, Any] = request.data.get('answers', {})
    result = process_decision_path(answers)
    return Response(result)


@api_view(['GET'])
def ethics_scenarios(request: Request) -> Response:
    """Get all available research scenarios."""
    return Response(RESEARCH_SCENARIOS)
