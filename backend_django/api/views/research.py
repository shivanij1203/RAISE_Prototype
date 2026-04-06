import uuid

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from api.models import ResearchConsent, AssessmentSession, AssessmentResponse


@api_view(['POST'])
def submit_consent(request: Request) -> Response:
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


@api_view(['POST'])
def start_session(request: Request) -> Response:
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
def record_response(request: Request) -> Response:
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
def complete_session(request: Request) -> Response:
    """Mark a session as complete with the final result."""
    session_code = request.data.get('session_code')
    session = AssessmentSession.objects.filter(session_code=session_code).first()

    if not session:
        return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

    session.is_complete = True
    session.completed_at = timezone.now()
    session.terminal_node = request.data.get('terminal_node', '')
    session.risk_level = request.data.get('risk_level', '')
    session.save()

    return Response({"message": "Session completed"})
