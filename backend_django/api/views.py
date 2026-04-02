import csv
import io
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse
from django.utils import timezone
from django.core.cache import cache

from .models import (
    UserProfile, ResearchConsent, AssessmentSession, AssessmentResponse,
    Project, Checkpoint, Decision, AITool, CheckpointComment
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


# ============== Framework Mapping ==============

FRAMEWORK_MAP = {
    'irb': ['IRB', 'Common Rule'],
    'data_classification': ['NIST AI RMF', 'Institutional Policy'],
    'ai_disclosure': ['Transparency', 'Journal Policy'],
    'data_deidentified': ['HIPAA', 'FERPA', 'NIST AI RMF'],
    'data_storage': ['NIST AI RMF', 'Institutional Policy'],
    'bias_audit': ['NIST AI RMF', 'Fairness'],
    'human_review': ['NIST AI RMF', 'Accountability'],
    'ai_coding_disclosure': ['Transparency', 'Journal Policy'],
    'participant_consent': ['IRB', 'Common Rule', 'FERPA'],
    'ai_writing_disclosure': ['Transparency', 'Journal Policy'],
    'grading_fairness': ['FERPA', 'Fairness', 'Institutional Policy'],
    'ferpa_compliance': ['FERPA'],
    'grading_transparency': ['FERPA', 'Transparency', 'Institutional Policy'],
    'human_override': ['FERPA', 'Accountability'],
    'grading_validation': ['NIST AI RMF', 'Accountability'],
    'content_accuracy': ['NIST AI RMF', 'Institutional Policy'],
    'accessibility_check': ['ADA', 'Section 508'],
    'ip_review': ['Copyright', 'Institutional Policy'],
    'teaching_disclosure': ['Transparency', 'Institutional Policy'],
    'material_review_cycle': ['NIST AI RMF', 'Institutional Policy'],
    'decision_impact': ['NIST AI RMF', 'Fairness'],
    'appeal_process': ['Accountability', 'Institutional Policy'],
    'admin_bias_audit': ['NIST AI RMF', 'Fairness', 'Civil Rights'],
    'data_minimization': ['NIST AI RMF', 'Privacy'],
    'admin_disclosure': ['Transparency', 'Institutional Policy'],
}


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

    grading_checkpoints = [
        {
            'checkpoint_id': 'grading_fairness',
            'label': 'Grading Fairness Audit',
            'category': 'Assessment',
            'assigned_to': 'pi',
            'what': 'Verify AI grading produces equitable outcomes across student demographics.',
            'why': 'AI grading tools can carry biases from training data, leading to unfair outcomes for certain student groups.',
            'how': 'Compare AI-generated grades across demographic subgroups. Check for statistically significant disparities. Document findings and any corrections made.',
        },
        {
            'checkpoint_id': 'ferpa_compliance',
            'label': 'FERPA Compliance Verified',
            'category': 'Regulatory',
            'assigned_to': 'pi',
            'what': 'Confirm student records processed by AI are handled per FERPA requirements.',
            'why': 'Student education records are protected under FERPA. Sending them to external AI services may violate federal law.',
            'how': 'Verify AI processing happens on FERPA-compliant systems. Check vendor data processing agreements. Confirm no student data is retained by third-party AI services.',
        },
        {
            'checkpoint_id': 'grading_transparency',
            'label': 'Grading Criteria Disclosed to Students',
            'category': 'Transparency',
            'assigned_to': 'pi',
            'what': 'Ensure students are informed that AI is used in the grading process.',
            'why': 'Students have a right to know how their work is evaluated. Transparency builds trust and meets institutional policy requirements.',
            'how': 'Update your syllabus to include AI grading disclosure. Communicate in class and provide an opt-out or appeal mechanism if required by policy.',
        },
        {
            'checkpoint_id': 'human_override',
            'label': 'Human Override Process Defined',
            'category': 'Assessment',
            'assigned_to': 'pi',
            'what': 'Define a process for students to appeal or request human review of AI-assisted grades.',
            'why': 'Students must have recourse when they believe an AI grade is incorrect. This is both an ethical and often institutional requirement.',
            'how': 'Establish a clear appeal window (e.g., 7 days). Document the process in the syllabus. Ensure a human instructor reviews all appeals.',
        },
        {
            'checkpoint_id': 'grading_validation',
            'label': 'AI Grading Output Validated',
            'category': 'Assessment',
            'assigned_to': 'pi',
            'what': 'Sample and validate AI-generated grades against instructor judgment.',
            'why': 'AI grading must be verified for accuracy before being applied at scale. Unvalidated AI grades risk harming student outcomes.',
            'how': 'Review a random 20-25% sample of AI grades. Compare with your own assessment. Document agreement rate and any adjustments made.',
        },
    ]

    teaching_checkpoints = [
        {
            'checkpoint_id': 'content_accuracy',
            'label': 'Content Accuracy Verified',
            'category': 'Quality',
            'assigned_to': 'pi',
            'what': 'Review AI-generated teaching materials for factual accuracy.',
            'why': 'AI can produce plausible-sounding but incorrect information. Distributing inaccurate materials undermines educational quality.',
            'how': 'Have a subject matter expert review all AI-generated content. Cross-reference claims with authoritative sources. Flag and correct any inaccuracies.',
        },
        {
            'checkpoint_id': 'accessibility_check',
            'label': 'Accessibility Standards Met',
            'category': 'Quality',
            'assigned_to': 'pi',
            'what': 'Ensure AI-generated materials meet accessibility requirements (ADA/Section 508).',
            'why': 'Institutions must provide accessible materials to all students. AI-generated content often lacks proper accessibility features.',
            'how': 'Test materials with screen readers. Ensure alt text, proper heading structure, and sufficient color contrast. Follow WCAG 2.1 AA guidelines.',
        },
        {
            'checkpoint_id': 'ip_review',
            'label': 'Intellectual Property Reviewed',
            'category': 'Regulatory',
            'assigned_to': 'pi',
            'what': 'Confirm AI-generated content does not infringe on existing copyrights.',
            'why': 'AI models trained on copyrighted material may reproduce protected content. Using such content in teaching materials creates legal risk.',
            'how': 'Check AI output for close similarity to known sources. Understand your institution\'s IP policy regarding AI-generated content. Add attribution where appropriate.',
        },
        {
            'checkpoint_id': 'teaching_disclosure',
            'label': 'AI Use Disclosed to Students',
            'category': 'Transparency',
            'assigned_to': 'pi',
            'what': 'Inform students that course materials include AI-generated content.',
            'why': 'Transparency about AI use in teaching sets expectations and models responsible AI practices for students.',
            'how': 'Add a disclosure statement to your syllabus. Label AI-generated materials clearly. Discuss AI\'s role in course material creation during the first class.',
        },
        {
            'checkpoint_id': 'material_review_cycle',
            'label': 'Periodic Review Cycle Established',
            'category': 'Quality',
            'assigned_to': 'pi',
            'what': 'Schedule regular reviews of AI-generated teaching materials for continued accuracy.',
            'why': 'AI-generated content may become outdated as knowledge evolves. Regular review ensures materials remain current and accurate.',
            'how': 'Set a review schedule (e.g., quarterly or each semester). Document review dates and any updates made. Assign responsibility for ongoing review.',
        },
    ]

    admin_checkpoints = [
        {
            'checkpoint_id': 'decision_impact',
            'label': 'Decision Impact Assessment Completed',
            'category': 'Governance',
            'assigned_to': 'pi',
            'what': 'Document who is affected by AI-assisted administrative decisions and how.',
            'why': 'Administrative decisions (admissions, resource allocation, scheduling) carry high-stakes consequences for individuals and groups.',
            'how': 'Identify all stakeholders affected. Estimate the number of people impacted. Assess potential consequences of incorrect decisions. Document findings.',
        },
        {
            'checkpoint_id': 'appeal_process',
            'label': 'Appeal / Recourse Process Defined',
            'category': 'Governance',
            'assigned_to': 'pi',
            'what': 'Ensure individuals affected by AI-informed decisions can challenge them.',
            'why': 'People affected by automated decisions have a right to human review. This is both an ethical obligation and increasingly a legal requirement.',
            'how': 'Create a written appeal process with clear timelines. Ensure a human decision-maker reviews all appeals. Publish the process where affected parties can find it.',
        },
        {
            'checkpoint_id': 'admin_bias_audit',
            'label': 'Bias Audit for Administrative Decisions',
            'category': 'Governance',
            'assigned_to': 'pi',
            'what': 'Test for disparate impact on protected groups in AI-assisted decisions.',
            'why': 'AI systems can perpetuate or amplify existing institutional biases, leading to discrimination in administrative outcomes.',
            'how': 'Analyze decision outcomes across demographic groups. Use disparate impact ratio (4/5ths rule) to identify potential bias. Document findings and corrective actions.',
        },
        {
            'checkpoint_id': 'data_minimization',
            'label': 'Data Minimization Verified',
            'category': 'Data',
            'assigned_to': 'pi',
            'what': 'Confirm only necessary data is used in administrative AI processing.',
            'why': 'Using excessive personal data increases privacy risk and potential for misuse without improving decision quality.',
            'how': 'Audit which data fields the AI system uses. Remove any fields not essential to the decision. Document the rationale for each retained field.',
        },
        {
            'checkpoint_id': 'admin_disclosure',
            'label': 'AI Use Disclosed to Affected Parties',
            'category': 'Transparency',
            'assigned_to': 'pi',
            'what': 'Notify people affected by decisions that AI was involved in the process.',
            'why': 'Transparency about AI involvement in decisions builds trust and is increasingly required by institutional policy and regulation.',
            'how': 'Include AI disclosure in decision notification letters/emails. Add disclosure to relevant web pages and application forms. Make the disclosure clear and prominent.',
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
    elif ai_use_case == 'grading':
        checkpoints += grading_checkpoints
    elif ai_use_case == 'teaching':
        checkpoints += teaching_checkpoints
    elif ai_use_case == 'admin':
        checkpoints += admin_checkpoints

    # Faculty-only use cases: assign ALL checkpoints to PI
    faculty_only_cases = {'grading', 'teaching', 'admin'}
    if ai_use_case in faculty_only_cases:
        checkpoints = [{**cp, 'assigned_to': 'pi'} for cp in checkpoints]

    # Inject framework tags from the mapping
    checkpoints = [{**cp, 'frameworks': FRAMEWORK_MAP.get(cp['checkpoint_id'], [])} for cp in checkpoints]

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
            'frameworks': cp.frameworks or [],
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
        'aiTools': [
            {'id': t.id, 'name': t.name, 'status': t.status, 'category': t.category}
            for t in project.ai_tools.all()
        ],
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

    # Link AI tools if provided
    ai_tool_ids = request.data.get('ai_tool_ids', [])
    if ai_tool_ids:
        tools = AITool.objects.filter(id__in=ai_tool_ids)
        project.ai_tools.set(tools)

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


# ============== Dashboard Endpoint ==============

@api_view(['GET'])
def dashboard_stats(request):
    """Personalized dashboard stats filtered by role and scope."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    profile, _ = UserProfile.objects.get_or_create(user=request.user, defaults={'role': 'student'})
    scope = request.query_params.get('scope', 'mine')

    # Students always see only their own. Faculty can toggle scope.
    if profile.role == 'student' or scope == 'mine':
        projects_qs = Project.objects.filter(user=request.user)
        decisions_qs = Decision.objects.filter(project__user=request.user)
    else:
        # Faculty with scope=all sees everything
        projects_qs = Project.objects.all()
        decisions_qs = Decision.objects.all()

    projects_qs = projects_qs.select_related('user').prefetch_related('checkpoints', 'decisions')
    total_activities = projects_qs.count()

    activities = []
    risk_counts = {'high': 0, 'medium': 0, 'low': 0}
    total_compliance = 0

    critical_ids = {'irb', 'data_deidentified', 'participant_consent', 'ferpa_compliance', 'grading_fairness', 'decision_impact'}
    medium_ids = {'bias_audit', 'human_review', 'ai_disclosure', 'human_override', 'admin_bias_audit', 'content_accuracy'}

    for p in projects_qs:
        cps = list(p.checkpoints.all())
        total_cp = len(cps)
        done_cp = sum(1 for c in cps if c.completed)
        pct = round((done_cp / total_cp) * 100) if total_cp > 0 else 0
        total_compliance += pct

        incomplete_critical = [c for c in cps if not c.completed and c.checkpoint_id in critical_ids]
        incomplete_medium = [c for c in cps if not c.completed and c.checkpoint_id in medium_ids]

        if incomplete_critical:
            risk = 'high'
        elif incomplete_medium or pct < 50:
            risk = 'medium'
        else:
            risk = 'low'

        risk_counts[risk] += 1

        activities.append({
            'id': str(p.id),
            'name': p.name,
            'owner': p.user.first_name or p.user.email,
            'aiUseCase': p.ai_use_case,
            'compliancePct': pct,
            'risk': risk,
            'createdAt': p.created_at.isoformat(),
            'checkpointsDone': done_cp,
            'checkpointsTotal': total_cp,
        })

    avg_compliance = round(total_compliance / total_activities) if total_activities > 0 else 0

    recent_decisions = decisions_qs.select_related('project', 'checkpoint').order_by('-logged_at')[:10]
    recent_feed = [{
        'activityName': d.project.name,
        'checkpoint': d.checkpoint.label,
        'description': d.description,
        'loggedAt': d.logged_at.isoformat(),
        'owner': d.project.user.first_name or d.project.user.email,
    } for d in recent_decisions]

    # Tool stats
    from django.db.models import Count
    tool_stats = {
        'total': AITool.objects.count(),
        'byStatus': {
            'approved': AITool.objects.filter(status='approved').count(),
            'under_review': AITool.objects.filter(status='under_review').count(),
            'not_recommended': AITool.objects.filter(status='not_recommended').count(),
        },
        'mostUsed': [
            {'id': t.id, 'name': t.name, 'category': t.category, 'count': t.usage_count}
            for t in AITool.objects.annotate(usage_count=Count('projects')).filter(usage_count__gt=0).order_by('-usage_count')[:5]
        ],
    }

    return Response({
        'totalActivities': total_activities,
        'avgCompliance': avg_compliance,
        'riskBreakdown': risk_counts,
        'recentFeed': recent_feed,
        'activities': sorted(activities, key=lambda a: a['createdAt'], reverse=True),
        'toolStats': tool_stats,
        'scope': scope,
        'userRole': profile.role,
        'userName': request.user.first_name or request.user.email,
    })


# ============== AI Tool Registry Endpoints ==============

def serialize_ai_tool(tool):
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
def ai_tool_list_create(request):
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

    # POST — faculty only
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
def ai_tool_update(request, tool_id):
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


# ============== Checkpoint Comment Endpoints ==============

@api_view(['GET', 'POST'])
def checkpoint_comments(request, project_id, checkpoint_id):
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


# ============== Project Export Endpoint ==============

@api_view(['GET'])
def project_export(request, project_id):
    """Export a project compliance report as CSV."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        'checkpoint_id', 'label', 'category', 'assigned_to',
        'completed', 'completed_at',
        'decision_description', 'decision_notes', 'proof_type', 'proof_value', 'logged_at'
    ])

    # One row per checkpoint; decisions are repeated per checkpoint
    for cp in project.checkpoints.all().order_by('id'):
        decisions = project.decisions.filter(checkpoint=cp).order_by('logged_at')
        if decisions.exists():
            for d in decisions:
                writer.writerow([
                    cp.checkpoint_id, cp.label, cp.category, cp.assigned_to,
                    cp.completed, cp.completed_at.isoformat() if cp.completed_at else '',
                    d.description, d.notes or '', d.proof_type or '', d.proof_value or '',
                    d.logged_at.isoformat(),
                ])
        else:
            writer.writerow([
                cp.checkpoint_id, cp.label, cp.category, cp.assigned_to,
                cp.completed, cp.completed_at.isoformat() if cp.completed_at else '',
                '', '', '', '', '',
            ])

    filename = f"{project.name.replace(' ', '_')}_compliance.csv"
    response = HttpResponse(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


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

    if not email.lower().endswith('@usf.edu'):
        return Response(
            {"error": "Registration is restricted to USF email addresses (@usf.edu)."},
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

    # Rate limit: 5 failed attempts per IP per 15 minutes
    ip = request.META.get('REMOTE_ADDR', 'unknown')
    cache_key = f'login_attempts_{ip}'
    attempts = cache.get(cache_key, 0)
    if attempts >= 5:
        return Response(
            {"error": "Too many failed login attempts. Please wait 15 minutes."},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    user = authenticate(username=email, password=password)
    if not user:
        cache.set(cache_key, attempts + 1, timeout=900)  # 15 min
        return Response(
            {"error": "Invalid email or password"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Clear failed attempts on successful login
    cache.delete(cache_key)

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
