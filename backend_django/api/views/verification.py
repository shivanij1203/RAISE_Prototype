"""Automated checkpoint verification endpoints.

Provides file-based scanning for PII detection, FERPA compliance checks,
and keyword-based data classification suggestions.
"""
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

from api.services.pii_scanner import scan_csv_for_pii, classify_data_from_description


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def scan_file_for_pii(request: Request) -> Response:
    """Upload a CSV file and scan it for personally identifiable information."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

    # Check file type
    filename = uploaded_file.name.lower()
    if not filename.endswith('.csv'):
        return Response(
            {"error": "Only CSV files are supported for PII scanning"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check file size (max 10MB)
    if uploaded_file.size > 10 * 1024 * 1024:
        return Response(
            {"error": "File too large. Maximum size is 10MB."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        content = uploaded_file.read().decode('utf-8')
    except UnicodeDecodeError:
        return Response(
            {"error": "Could not read file. Please ensure it is a valid UTF-8 CSV."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Determine scan type from query param
    scan_type = request.data.get('scan_type', 'pii')
    result = scan_csv_for_pii(content)

    # For FERPA scans, add extra context
    if scan_type == 'ferpa':
        ferpa_fields = ['grade', 'enrollment', 'id_number']
        ferpa_findings = [f for f in result['findings'] if f['type'] in ferpa_fields]
        result['ferpaSpecific'] = {
            'hasFerpaData': len(ferpa_findings) > 0,
            'ferpaFindings': ferpa_findings,
            'verdict': 'Student education records detected — FERPA protections apply'
                if ferpa_findings else 'No student education record patterns detected',
        }

    return Response(result)


@api_view(['POST'])
def classify_data(request: Request) -> Response:
    """Suggest a data classification level based on a text description."""
    if not request.user.is_authenticated:
        return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

    description = request.data.get('description', '').strip()
    if not description:
        return Response(
            {"error": "Description is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = classify_data_from_description(description)
    return Response(result)
