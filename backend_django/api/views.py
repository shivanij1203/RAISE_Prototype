from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout

from .models import UserProfile, ResearchConsent, AssessmentSession, AssessmentResponse
import uuid

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


# ============== Auth Endpoints ==============

@api_view(['POST'])
def register(request):
    """Register a new user."""
    email = request.data.get('email')
    password = request.data.get('password')
    full_name = request.data.get('full_name', '')
    role = request.data.get('role', 'student')

    if not email or not password:
        return Response(
            {"error": "Email and password are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    valid_roles = ['student', 'faculty', 'admin']
    if role not in valid_roles:
        return Response(
            {"error": f"Role must be one of: {', '.join(valid_roles)}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=email).exists():
        return Response(
            {"error": "An account with this email already exists"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 8:
        return Response(
            {"error": "Password must be at least 8 characters"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=full_name
    )
    UserProfile.objects.create(user=user, role=role)

    return Response({
        "message": "Account created",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.first_name,
            "role": role
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_view(request):
    """Login with email and password."""
    email = request.data.get('email')
    password = request.data.get('password')

    user = authenticate(username=email, password=password)
    if not user:
        return Response(
            {"error": "Invalid email or password"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    login(request, user)
    profile, _ = UserProfile.objects.get_or_create(
        user=user, defaults={'role': 'student'}
    )

    return Response({
        "message": "Logged in",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.first_name,
            "role": profile.role
        }
    })


@api_view(['POST'])
def logout_view(request):
    """Logout."""
    logout(request)
    return Response({"message": "Logged out"})


@api_view(['GET'])
def me(request):
    """Get current user info."""
    if not request.user.is_authenticated:
        return Response(
            {"error": "Not logged in"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    profile, _ = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={'role': 'student'}
    )

    return Response({
        "id": request.user.id,
        "email": request.user.email,
        "full_name": request.user.first_name,
        "role": profile.role
    })


# ============== Consent Endpoints ==============

@api_view(['POST'])
def submit_consent(request):
    """Record research participation consent."""
    code = f"P-{uuid.uuid4().hex[:8].upper()}"

    consent = ResearchConsent.objects.create(
        participant_code=code,
        status='consented',
        consent_to_data_collection=request.data.get('consent_to_data_collection', False),
        consent_to_longitudinal=request.data.get('consent_to_longitudinal', False),
        role=request.data.get('role', ''),
        department_category=request.data.get('department_category', ''),
    )

    return Response({
        "participant_code": consent.participant_code,
        "message": "Consent recorded"
    }, status=status.HTTP_201_CREATED)


# ============== Session Tracking Endpoints ==============

@api_view(['POST'])
def start_session(request):
    """Start a new assessment session so responses get saved."""
    code = f"S-{uuid.uuid4().hex[:8].upper()}"
    participant_code = request.data.get('participant_code')

    participant = None
    if participant_code:
        participant = ResearchConsent.objects.filter(
            participant_code=participant_code
        ).first()

    session = AssessmentSession.objects.create(
        session_code=code,
        participant=participant,
        initial_scenario=request.data.get('initial_scenario', ''),
    )

    return Response({
        "session_code": session.session_code
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def record_response(request):
    """Save an individual answer within a session."""
    session_code = request.data.get('session_code')
    session = AssessmentSession.objects.filter(session_code=session_code).first()

    if not session:
        return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

    AssessmentResponse.objects.create(
        session=session,
        node_key=request.data.get('node_key', ''),
        answer_value=request.data.get('answer_value', ''),
        answer_label=request.data.get('answer_label', ''),
        response_order=request.data.get('response_order', 0),
    )

    return Response({"message": "Response saved"})


@api_view(['POST'])
def complete_session(request):
    """Mark a session as complete with the final result."""
    session_code = request.data.get('session_code')
    session = AssessmentSession.objects.filter(session_code=session_code).first()

    if not session:
        return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

    from django.utils import timezone
    session.is_complete = True
    session.completed_at = timezone.now()
    session.terminal_node = request.data.get('terminal_node', '')
    session.risk_level = request.data.get('risk_level', '')
    session.save()

    return Response({"message": "Session completed"})
