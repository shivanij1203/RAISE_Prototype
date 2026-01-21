from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services.ethics_engine import (
    get_decision_node,
    get_terminal_result,
    get_template,
    get_all_templates,
    process_decision_path,
    generate_document,
    RESEARCH_SCENARIOS
)
from .services.assessment_data import (
    get_questions,
    get_categories,
    calculate_results
)


# ============== Ethics Assistant Endpoints ==============

@api_view(['GET'])
def ethics_start(request):
    """Get the starting node of the decision tree."""
    node = get_decision_node("start")
    return Response({"key": "start", **node})


@api_view(['GET'])
def ethics_node(request, node_key):
    """Get a specific node in the decision tree."""
    node = get_decision_node(node_key)
    if not node:
        return Response(
            {"error": "Node not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    return Response({"key": node_key, **node})


@api_view(['POST'])
def ethics_evaluate(request):
    """Evaluate the complete decision path and return results."""
    answers = request.data.get('answers', {})
    result = process_decision_path(answers)
    return Response(result)


@api_view(['GET'])
def ethics_scenarios(request):
    """Get all available research scenarios."""
    return Response(RESEARCH_SCENARIOS)


# ============== Template/Document Endpoints ==============

@api_view(['GET'])
def template_list(request):
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
def template_detail(request, template_key):
    """Get a specific template."""
    template = get_template(template_key)
    if not template:
        return Response(
            {"error": "Template not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    return Response({"key": template_key, **template})


@api_view(['POST'])
def document_generate(request):
    """Generate a document from a template with filled values."""
    template_key = request.data.get('template_key')
    fields = request.data.get('fields', {})

    result = generate_document(template_key, fields)
    if not result:
        return Response(
            {"error": "Template not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    return Response(result)


# ============== Assessment Endpoints ==============

@api_view(['GET'])
def assessment_questions(request):
    """Get all assessment questions."""
    return Response({
        "questions": get_questions(),
        "categories": get_categories()
    })


@api_view(['POST'])
def assessment_submit(request):
    """Submit assessment answers and get results."""
    answers = request.data.get('answers', {})
    results = calculate_results(answers)
    return Response(results)
