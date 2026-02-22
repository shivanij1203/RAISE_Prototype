from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone

from .models import (
    UserProfile, ResearchConsent, AssessmentSession, AssessmentResponse,
    Project, Checkpoint, Decision
)
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


# ============== Checkpoint Generation Logic ==============

def generate_checkpoints_for_use_case(ai_use_case):
    """Return the right set of checkpoints depending on what kind of AI use case it is."""

    base = [
        {
            'checkpoint_id': 'irb',
            'label': 'IRB Status Confirmed',
            'category': 'Regulatory',
            'assigned_to': 'pi',
            'what': 'Verify whether your research requires IRB approval and if your current protocol covers AI use.',
            'why': 'IRB approval obtained before AI tools existed may not cover new AI methods. Using AI on human subjects data without proper approval is a compliance violation.',
            'how': 'Check your IRB protocol. If AI is not mentioned, contact your IRB office to determine if an amendment is needed.',
        },
        {
            'checkpoint_id': 'data_classification',
            'label': 'Data Classification Determined',
            'category': 'Data',
            'assigned_to': 'pi',
            'what': 'Identify what type of data you are using and its sensitivity level.',
            'why': 'Different data types have different handling requirements. Identifiable health data requires stricter controls than public datasets.',
            'how': 'Categorize your data: Public, Internal, Confidential, or Restricted. Check if it contains PII, PHI, or other sensitive information.',
        },
        {
            'checkpoint_id': 'ai_disclosure',
            'label': 'AI Use Disclosure Planned',
            'category': 'Transparency',
            'assigned_to': 'pi',
            'what': 'Plan how you will disclose AI use in publications, presentations, and to participants.',
            'why': 'Most journals and conferences now require AI disclosure. Transparency builds trust and is increasingly required by publishers.',
            'how': 'Draft a disclosure statement describing which AI tools were used and for what purpose. Include in your methods section.',
        },
    ]

    data_checkpoints = [
        {
            'checkpoint_id': 'data_deidentified',
            'label': 'Data De-identification Verified',
            'category': 'Data',
            'assigned_to': 'student',
            'what': 'Ensure personal identifiers are removed before AI processing.',
            'why': 'Sending identifiable data to AI systems (especially cloud-based) may violate privacy regulations and IRB requirements.',
            'how': 'Remove or mask: names, dates, locations, ID numbers, photos, and any combination that could identify someone. Use established de-identification standards (HIPAA Safe Harbor or Expert Determination).',
        },
        {
            'checkpoint_id': 'data_storage',
            'label': 'Secure Storage Confirmed',
            'category': 'Data',
            'assigned_to': 'student',
            'what': 'Verify that data and AI outputs are stored securely.',
            'why': 'Research data requires protection from unauthorized access. Cloud AI services may retain data unless configured otherwise.',
            'how': 'Use institutional approved storage. Check AI service data retention policies. Enable encryption at rest and in transit.',
        },
    ]

    model_checkpoints = [
        {
            'checkpoint_id': 'bias_audit',
            'label': 'Bias Audit Conducted',
            'category': 'Model',
            'assigned_to': 'student',
            'what': 'Test your AI model for unfair or biased outcomes across different groups.',
            'why': 'AI models can perpetuate or amplify biases in training data, leading to unfair outcomes for certain populations.',
            'how': 'Evaluate model performance across demographic subgroups (age, gender, race if applicable). Compare error rates and outcomes. Document any disparities found and mitigation steps taken.',
        },
        {
            'checkpoint_id': 'human_review',
            'label': 'Human Review Process Defined',
            'category': 'Model',
            'assigned_to': 'pi',
            'what': 'Establish how humans will review and validate AI outputs.',
            'why': 'AI systems make errors. Human oversight catches mistakes and maintains accountability, especially for consequential decisions.',
            'how': 'Define: Who reviews AI outputs? What percentage is reviewed? What are the criteria for acceptance/rejection? Document the review process.',
        },
    ]

    qualitative_checkpoints = [
        {
            'checkpoint_id': 'ai_coding_disclosure',
            'label': 'AI-Assisted Coding Disclosed',
            'category': 'Transparency',
            'assigned_to': 'student',
            'what': 'Document how AI was used in qualitative coding or analysis.',
            'why': 'Using AI to code interviews or analyze text changes the methodology. Reviewers and readers need to evaluate this.',
            'how': 'Describe the AI tool used, what it did (initial codes, theme suggestions), and how human researchers validated or modified the output.',
        },
        {
            'checkpoint_id': 'participant_consent',
            'label': 'Participant Consent Covers AI',
            'category': 'Regulatory',
            'assigned_to': 'pi',
            'what': 'Ensure consent forms mention AI processing of participant data.',
            'why': 'Participants have a right to know their data will be processed by AI systems, especially if using cloud-based tools.',
            'how': 'Review consent forms. If AI use was not mentioned, consult IRB about whether re-consent or notification is needed.',
        },
    ]

    writing_checkpoints = [
        {
            'checkpoint_id': 'ai_writing_disclosure',
            'label': 'AI Writing Assistance Disclosed',
            'category': 'Transparency',
            'assigned_to': 'student',
            'what': 'Document any AI assistance in drafting or editing text.',
            'why': 'Journals require disclosure of AI writing tools. Undisclosed use may be considered a form of misconduct.',
            'how': 'List AI tools used (e.g., ChatGPT, Grammarly AI). Describe the extent: grammar checking, sentence rephrasing, content generation. Place in acknowledgments or methods.',
        },
    ]

    checkpoints = list(base)

    if ai_use_case == 'data_analysis':
        checkpoints += data_checkpoints + model_checkpoints
    elif ai_use_case == 'qualitative':
        checkpoints += data_checkpoints + qualitative_checkpoints
    elif ai_use_case == 'ml_model':
        checkpoints += data_checkpoints + model_checkpoints
    elif ai_use_case == 'writing':
        checkpoints += writing_checkpoints
    elif ai_use_case == 'literature':
        checkpoints += writing_checkpoints

    return checkpoints


def serialize_project(project):
    """Serialize a project with its checkpoints and decisions."""
    checkpoints = []
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
        })

    decisions = []
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
    }


# ============== Project Endpoints ==============

@api_view(['GET', 'POST'])
def project_list_create(request):
    """List all projects for the user, or create a new one."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        projects = Project.objects.filter(user=request.user).order_by('-created_at')
        return Response([serialize_project(p) for p in projects])

    # POST — create
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

    return Response(serialize_project(project), status=status.HTTP_201_CREATED)


@api_view(['GET'])
def project_detail(request, project_id):
    """Get a single project with checkpoints and decisions."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(serialize_project(project))


@api_view(['PUT'])
def checkpoint_toggle(request, project_id, checkpoint_id):
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
def decision_create(request, project_id):
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
    # Accept both 'fields' and 'field_values' for compatibility
    fields = request.data.get('fields') or request.data.get('field_values', {})

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

    session.is_complete = True
    session.completed_at = timezone.now()
    session.terminal_node = request.data.get('terminal_node', '')
    session.risk_level = request.data.get('risk_level', '')
    session.save()

    return Response({"message": "Session completed"})
