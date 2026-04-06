from typing import Any

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

from api.services.ethics_engine import (
    get_all_templates,
    get_template,
    generate_document,
)


@api_view(['GET'])
def template_list(request: Request) -> Response:
    """Get all available document templates."""
    templates = get_all_templates()
    return Response([
        {
            "key": key,
            "name": t["name"],
            "description": t["description"]
        }
        for key, t in templates.items()
    ])


@api_view(['GET'])
def template_detail(request: Request, template_key: str) -> Response:
    """Get a specific template."""
    template = get_template(template_key)
    if not template:
        return Response(
            {"error": "Template not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    return Response({"key": template_key, **template})


@api_view(['POST'])
def document_generate(request: Request) -> Response:
    """Generate a document from a template with filled values."""
    template_key: str | None = request.data.get('template_key')
    # Accept both 'fields' and 'field_values' for compatibility
    fields: dict[str, Any] = request.data.get('fields') or request.data.get('field_values', {})

    result = generate_document(template_key, fields)
    if not result:
        return Response(
            {"error": "Template not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    return Response(result)
