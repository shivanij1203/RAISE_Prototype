"""
PII Scanner — Detects personally identifiable information in uploaded data files.

Supports CSV files and plain text. Uses regex pattern matching on both
column headers and cell values to identify potential PII.
"""
import csv
import io
import re


# Column header patterns that suggest PII
PII_HEADER_PATTERNS = {
    'name': r'\b(first.?name|last.?name|full.?name|student.?name|patient.?name|^name$)\b',
    'email': r'\b(e.?mail|email.?address)\b',
    'phone': r'\b(phone|mobile|cell|telephone|tel)\b',
    'ssn': r'\b(ssn|social.?security|ss.?number)\b',
    'address': r'\b(address|street|city|zip.?code|postal|state)\b',
    'dob': r'\b(dob|date.?of.?birth|birth.?date|birthday)\b',
    'id_number': r'\b(student.?id|patient.?id|employee.?id|id.?number|^id$)\b',
    'grade': r'\b(grade|score|gpa|final.?grade|letter.?grade)\b',
    'enrollment': r'\b(enrollment|enrolled|major|program|department|class.?section)\b',
}

# Value patterns that suggest PII in cell content
PII_VALUE_PATTERNS = {
    'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    'phone': r'(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})',
    'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
    'date_of_birth': r'\b(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/(19|20)\d{2}\b',
    'ip_address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
    'zip_code': r'\b\d{5}(-\d{4})?\b',
}

# Classification keywords for data classification checkpoint
CLASSIFICATION_KEYWORDS = {
    'restricted': ['ssn', 'social security', 'credit card', 'bank account', 'financial',
                   'password', 'authentication', 'biometric'],
    'confidential': ['health', 'medical', 'patient', 'hipaa', 'diagnosis', 'treatment',
                     'student record', 'ferpa', 'grade', 'gpa', 'disciplinary',
                     'employee', 'salary', 'performance review'],
    'internal': ['enrollment', 'department', 'course', 'schedule', 'internal',
                 'research data', 'survey response', 'interview'],
    'public': ['published', 'public', 'open data', 'census', 'aggregate',
               'anonymized', 'de-identified'],
}


def scan_csv_for_pii(file_content):
    """Scan CSV content for PII patterns.

    Returns a dict with findings grouped by type.
    """
    findings = []
    try:
        reader = csv.reader(io.StringIO(file_content))
        headers = next(reader, [])
    except Exception:
        return {'error': 'Could not parse file as CSV', 'findings': [], 'summary': {}}

    # Check headers
    flagged_columns = {}
    for i, header in enumerate(headers):
        header_lower = header.lower().strip()
        for pii_type, pattern in PII_HEADER_PATTERNS.items():
            if re.search(pattern, header_lower, re.IGNORECASE):
                flagged_columns[i] = pii_type
                findings.append({
                    'type': pii_type,
                    'source': 'column_header',
                    'column': header,
                    'column_index': i,
                    'message': f'Column "{header}" appears to contain {pii_type.replace("_", " ")} data',
                    'severity': 'high' if pii_type in ('ssn', 'name', 'email', 'dob') else 'medium',
                })

    # Sample cell values (first 100 rows)
    value_flags = {}
    row_count = 0
    for row in reader:
        row_count += 1
        if row_count > 100:
            break
        for i, cell in enumerate(row):
            if i in flagged_columns:
                continue  # Already flagged by header
            cell = cell.strip()
            if not cell:
                continue
            for pii_type, pattern in PII_VALUE_PATTERNS.items():
                if re.search(pattern, cell):
                    col_name = headers[i] if i < len(headers) else f'Column {i + 1}'
                    key = (i, pii_type)
                    if key not in value_flags:
                        value_flags[key] = True
                        findings.append({
                            'type': pii_type,
                            'source': 'cell_value',
                            'column': col_name,
                            'column_index': i,
                            'sample': cell[:30] + ('...' if len(cell) > 30 else ''),
                            'message': f'Column "{col_name}" contains values matching {pii_type.replace("_", " ")} patterns',
                            'severity': 'high' if pii_type in ('ssn', 'email') else 'medium',
                        })

    # Build summary
    pii_types_found = list(set(f['type'] for f in findings))
    has_pii = len(findings) > 0

    return {
        'hasPII': has_pii,
        'findings': findings,
        'totalColumns': len(headers),
        'rowsScanned': min(row_count, 100),
        'flaggedColumns': len(set(f['column_index'] for f in findings)),
        'piiTypesFound': pii_types_found,
        'verdict': 'PII detected — data de-identification is required before processing'
            if has_pii else 'No PII patterns detected — data appears to be de-identified',
        'summary': {
            'high': len([f for f in findings if f['severity'] == 'high']),
            'medium': len([f for f in findings if f['severity'] == 'medium']),
        }
    }


def classify_data_from_description(description):
    """Suggest a data classification level based on text description.

    Returns the suggested classification and reasoning.
    """
    description_lower = description.lower()
    matched = {}

    for level, keywords in CLASSIFICATION_KEYWORDS.items():
        matches = [kw for kw in keywords if kw in description_lower]
        if matches:
            matched[level] = matches

    # Pick the highest severity match
    for level in ['restricted', 'confidential', 'internal', 'public']:
        if level in matched:
            return {
                'suggestedLevel': level,
                'matchedKeywords': matched[level],
                'reasoning': f'Data appears to be {level.upper()} based on keywords: {", ".join(matched[level])}',
                'allMatches': matched,
            }

    return {
        'suggestedLevel': 'unknown',
        'matchedKeywords': [],
        'reasoning': 'Could not determine classification from the description. Please review manually.',
        'allMatches': matched,
    }
