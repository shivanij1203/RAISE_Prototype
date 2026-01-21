# Decision engine for AI research ethics guidance

RESEARCH_SCENARIOS = {
    "qualitative_analysis": {
        "name": "Qualitative Data Analysis",
        "description": "Using AI to help analyze interviews, focus groups, or open-ended responses",
        "category": "qualitative"
    },
    "literature_review": {
        "name": "Literature Review & Synthesis",
        "description": "Using AI to search, summarize, or synthesize research literature",
        "category": "research"
    },
    "writing_assistance": {
        "name": "Writing & Editing Assistance",
        "description": "Using AI to help draft, edit, or improve research manuscripts",
        "category": "writing"
    },
    "data_analysis": {
        "name": "Quantitative Data Analysis",
        "description": "Using AI for statistical analysis, code generation, or data processing",
        "category": "quantitative"
    },
    "grant_writing": {
        "name": "Grant Proposal Writing",
        "description": "Using AI to help draft or improve grant proposals",
        "category": "writing"
    },
    "teaching_materials": {
        "name": "Teaching Material Development",
        "description": "Using AI to create syllabi, assignments, or educational content",
        "category": "teaching"
    },
    "student_feedback": {
        "name": "Student Assessment & Feedback",
        "description": "Using AI to help grade or provide feedback on student work",
        "category": "teaching"
    },
    "code_generation": {
        "name": "Research Code Generation",
        "description": "Using AI to write or debug code for research purposes",
        "category": "quantitative"
    }
}

DECISION_TREE = {
    "start": {
        "question": "What do you want to use AI for?",
        "help_text": "Select the primary use case for AI in your research or teaching",
        "type": "select",
        "options": [
            {"value": "qualitative_analysis", "label": "Analyze qualitative data (interviews, transcripts)", "next": "human_subjects"},
            {"value": "literature_review", "label": "Literature review and synthesis", "next": "publication_intent"},
            {"value": "writing_assistance", "label": "Writing or editing assistance", "next": "publication_intent"},
            {"value": "data_analysis", "label": "Quantitative/statistical analysis", "next": "human_subjects"},
            {"value": "grant_writing", "label": "Grant proposal writing", "next": "funder_policy"},
            {"value": "teaching_materials", "label": "Create teaching materials", "next": "student_data"},
            {"value": "student_feedback", "label": "Grade or give student feedback", "next": "student_data"},
            {"value": "code_generation", "label": "Generate research code", "next": "code_context"}
        ]
    },
    "human_subjects": {
        "question": "Does your research involve human subjects?",
        "help_text": "Human subjects include interviews, surveys, medical records, or any data from identifiable individuals",
        "type": "boolean",
        "options": [
            {"value": True, "label": "Yes, involves human subjects", "next": "irb_status"},
            {"value": False, "label": "No human subjects involved", "next": "publication_intent"}
        ]
    },
    "irb_status": {
        "question": "What is your IRB status?",
        "help_text": "Institutional Review Board approval status for your research",
        "type": "select",
        "options": [
            {"value": "approved", "label": "IRB approved (AI use not in protocol)", "next": "data_identifiability"},
            {"value": "approved_with_ai", "label": "IRB approved (AI use included)", "next": "data_identifiability"},
            {"value": "pending", "label": "IRB submission pending", "next": "data_identifiability"},
            {"value": "exempt", "label": "IRB exempt", "next": "data_identifiability"},
            {"value": "none", "label": "No IRB yet", "next": "data_identifiability"}
        ]
    },
    "data_identifiability": {
        "question": "Will you input identifiable data into the AI tool?",
        "help_text": "Identifiable data includes names, emails, ID numbers, or any combination that could identify someone",
        "type": "select",
        "options": [
            {"value": "identifiable", "label": "Yes, data will contain identifiers", "next": "terminal_high_risk"},
            {"value": "deidentified", "label": "No, data will be de-identified first", "next": "publication_intent"},
            {"value": "unsure", "label": "I'm not sure", "next": "terminal_needs_review"}
        ]
    },
    "publication_intent": {
        "question": "Do you plan to publish this research?",
        "help_text": "Including journal articles, conference papers, dissertations, or public reports",
        "type": "boolean",
        "options": [
            {"value": True, "label": "Yes, will be published", "next": "journal_policy"},
            {"value": False, "label": "No, internal use only", "next": "terminal_low_risk"}
        ]
    },
    "journal_policy": {
        "question": "Does your target journal have an AI disclosure policy?",
        "help_text": "Many journals now require disclosure of AI use in manuscripts",
        "type": "select",
        "options": [
            {"value": "yes_disclosure", "label": "Yes, requires disclosure", "next": "terminal_publication"},
            {"value": "no_policy", "label": "No specific policy", "next": "terminal_publication"},
            {"value": "prohibits", "label": "Prohibits AI use", "next": "terminal_prohibited"},
            {"value": "unknown", "label": "I don't know yet", "next": "terminal_publication"}
        ]
    },
    "student_data": {
        "question": "Will you input student work or data into AI?",
        "help_text": "This includes student papers, emails, names, or any student records",
        "type": "boolean",
        "options": [
            {"value": True, "label": "Yes", "next": "ferpa_awareness"},
            {"value": False, "label": "No, only my own content", "next": "terminal_teaching_safe"}
        ]
    },
    "ferpa_awareness": {
        "question": "Are you aware of FERPA requirements for student data?",
        "help_text": "FERPA restricts sharing student educational records with third parties",
        "type": "select",
        "options": [
            {"value": "yes_compliant", "label": "Yes, I will anonymize data", "next": "terminal_teaching_ferpa"},
            {"value": "yes_unsure", "label": "Yes, but unsure how to comply", "next": "terminal_ferpa_help"},
            {"value": "no", "label": "No, what is FERPA?", "next": "terminal_ferpa_help"}
        ]
    },
    "funder_policy": {
        "question": "Does your funder have AI use policies?",
        "help_text": "NIH, NSF, and other funders may have specific AI policies",
        "type": "select",
        "options": [
            {"value": "yes", "label": "Yes, they have policies", "next": "terminal_grant"},
            {"value": "no", "label": "No specific policies", "next": "terminal_grant"},
            {"value": "unknown", "label": "I need to check", "next": "terminal_grant"}
        ]
    },
    "code_context": {
        "question": "What will the AI-generated code be used for?",
        "help_text": "Consider whether the code will process sensitive data or be published",
        "type": "select",
        "options": [
            {"value": "analysis", "label": "Data analysis (will be published)", "next": "terminal_code_publish"},
            {"value": "internal", "label": "Internal tooling only", "next": "terminal_code_internal"},
            {"value": "sensitive", "label": "Processing sensitive/human subjects data", "next": "terminal_code_sensitive"}
        ]
    }
}

TERMINAL_NODES = {
    "terminal_high_risk": {
        "risk_level": "high",
        "title": "Action Required Before Proceeding",
        "summary": "You can use AI for this task, but you need to take specific steps first to ensure compliance.",
        "safe_path": {
            "title": "Your Path Forward",
            "description": "Follow these steps in order to use AI safely with your research:",
            "steps": [
                {
                    "step": 1,
                    "title": "De-identify Your Data",
                    "description": "Remove all 18 HIPAA identifiers from your data before inputting to any AI tool. This includes names, dates, locations, emails, and ID numbers.",
                    "template": "deidentification_checklist",
                    "time_estimate": "1-2 hours depending on dataset size"
                },
                {
                    "step": 2,
                    "title": "Submit IRB Amendment",
                    "description": "Your current IRB protocol doesn't include AI use. Submit an amendment describing the AI tool, how you'll use it, and your data protection measures.",
                    "template": "irb_amendment",
                    "time_estimate": "IRB review typically takes 2-4 weeks"
                },
                {
                    "step": 3,
                    "title": "Proceed with AI Analysis",
                    "description": "Once your data is de-identified and IRB amendment is approved, you can safely use AI tools for your analysis.",
                    "template": "reproducibility_log",
                    "time_estimate": "Ongoing"
                }
            ]
        },
        "considerations": [
            {
                "severity": "important",
                "title": "Why These Steps Matter",
                "guidance": "Most AI tools (ChatGPT, Claude, etc.) are not HIPAA compliant. Without de-identification, you risk violating federal regulations and your IRB protocol."
            },
            {
                "severity": "recommended",
                "title": "Consider Alternatives",
                "guidance": "If de-identification isn't feasible, consider: (1) local AI models that don't send data externally, or (2) manual analysis for the sensitive portions."
            }
        ],
        "templates": ["deidentification_checklist", "irb_amendment", "reproducibility_log"]
    },
    "terminal_needs_review": {
        "risk_level": "medium",
        "title": "Review Needed: Data Classification Unclear",
        "summary": "You need to determine whether your data is identifiable before proceeding.",
        "considerations": [
            {
                "severity": "important",
                "title": "Assess Your Data",
                "guidance": "Review your dataset for any of the 18 HIPAA identifiers: names, geographic data, dates, phone numbers, email addresses, SSN, medical record numbers, etc."
            },
            {
                "severity": "recommended",
                "title": "Consult Your IRB",
                "guidance": "If unsure, contact your IRB office. They can help determine if your data is identifiable and what protections are needed."
            }
        ],
        "templates": ["deidentification_checklist", "irb_consultation_email"]
    },
    "terminal_publication": {
        "risk_level": "low",
        "title": "Publication Ready: Disclosure Required",
        "summary": "You can proceed with AI use, but must properly document and disclose it.",
        "considerations": [
            {
                "severity": "important",
                "title": "Document Your AI Use",
                "guidance": "Keep a log of: which AI tool, version, dates used, prompts given, and how outputs were used. This ensures reproducibility."
            },
            {
                "severity": "important",
                "title": "Prepare Disclosure Statement",
                "guidance": "Most journals require disclosure of AI assistance. Prepare a statement describing how AI was used and in what capacity."
            },
            {
                "severity": "recommended",
                "title": "Verify AI Outputs",
                "guidance": "AI can hallucinate facts and citations. Verify all factual claims and references independently."
            }
        ],
        "templates": ["disclosure_statement", "reproducibility_log", "verification_checklist"]
    },
    "terminal_low_risk": {
        "risk_level": "low",
        "title": "Low Risk: Internal Use",
        "summary": "For internal, non-published use, risks are minimal but documentation is still recommended.",
        "considerations": [
            {
                "severity": "recommended",
                "title": "Basic Documentation",
                "guidance": "Even for internal use, documenting AI assistance helps maintain research integrity and can be useful if you later decide to publish."
            },
            {
                "severity": "recommended",
                "title": "Verify Outputs",
                "guidance": "AI outputs should be verified, especially for data analysis or literature claims."
            }
        ],
        "templates": ["reproducibility_log"]
    },
    "terminal_prohibited": {
        "risk_level": "high",
        "title": "Prohibited: Journal Restricts AI Use",
        "summary": "Your target journal prohibits AI use. Proceeding could result in rejection or retraction.",
        "considerations": [
            {
                "severity": "critical",
                "title": "Do Not Use AI for This Manuscript",
                "guidance": "If the journal prohibits AI assistance, using it could result in desk rejection, retraction, or damage to your reputation."
            },
            {
                "severity": "important",
                "title": "Consider Alternative Journals",
                "guidance": "If AI assistance is important to your workflow, consider journals with more permissive policies."
            }
        ],
        "templates": []
    },
    "terminal_teaching_safe": {
        "risk_level": "low",
        "title": "Low Risk: Teaching Materials",
        "summary": "Creating teaching materials with AI assistance is generally low risk when not involving student data.",
        "considerations": [
            {
                "severity": "recommended",
                "title": "Review for Accuracy",
                "guidance": "AI-generated educational content should be reviewed for accuracy before use with students."
            },
            {
                "severity": "recommended",
                "title": "Model Transparency",
                "guidance": "Consider being transparent with students about AI use in material creation. This models ethical AI practices."
            }
        ],
        "templates": ["teaching_disclosure"]
    },
    "terminal_teaching_ferpa": {
        "risk_level": "medium",
        "title": "Proceed with Caution: FERPA Compliance Required",
        "summary": "You can use AI with student work if properly anonymized.",
        "considerations": [
            {
                "severity": "critical",
                "title": "Anonymize Before Input",
                "guidance": "Remove all student identifiers before inputting work into AI: names, student IDs, email addresses, and any other identifying information."
            },
            {
                "severity": "important",
                "title": "Check Institutional Policy",
                "guidance": "Your institution may have specific policies about AI use with student data. Check with your department or IT security office."
            },
            {
                "severity": "recommended",
                "title": "Inform Students",
                "guidance": "Consider adding a syllabus statement about how AI tools may be used in grading or feedback."
            }
        ],
        "templates": ["ferpa_compliance_checklist", "syllabus_ai_statement"]
    },
    "terminal_ferpa_help": {
        "risk_level": "high",
        "title": "FERPA Training Needed",
        "summary": "Before using AI with student data, you need to understand FERPA requirements.",
        "considerations": [
            {
                "severity": "critical",
                "title": "Do Not Input Student Data Yet",
                "guidance": "Until you understand FERPA, do not input any student work or data into AI tools."
            },
            {
                "severity": "critical",
                "title": "Complete FERPA Training",
                "guidance": "Most institutions offer FERPA training. Complete this before using AI with any student information."
            },
            {
                "severity": "important",
                "title": "Understand the Risks",
                "guidance": "FERPA violations can result in loss of federal funding for your institution and personal liability."
            }
        ],
        "templates": ["ferpa_overview", "ferpa_compliance_checklist"]
    },
    "terminal_grant": {
        "risk_level": "medium",
        "title": "Grant Writing: Check Funder Requirements",
        "summary": "AI can assist with grant writing, but funder policies vary.",
        "considerations": [
            {
                "severity": "important",
                "title": "Check Funder Policy",
                "guidance": "NIH, NSF, and other funders have varying policies on AI use. Some require disclosure, others prohibit certain uses. Check before submitting."
            },
            {
                "severity": "important",
                "title": "Maintain Authenticity",
                "guidance": "Grant proposals should represent your authentic ideas and capabilities. Use AI for refinement, not idea generation."
            },
            {
                "severity": "recommended",
                "title": "Document AI Assistance",
                "guidance": "Keep records of how AI was used in case disclosure is required or questioned."
            }
        ],
        "templates": ["grant_ai_disclosure", "reproducibility_log"]
    },
    "terminal_code_publish": {
        "risk_level": "medium",
        "title": "Code for Publication: Documentation Required",
        "summary": "AI-generated code for published research must be documented and verified.",
        "considerations": [
            {
                "severity": "important",
                "title": "Document AI Assistance",
                "guidance": "Record which parts of your code were AI-generated. This is important for reproducibility and transparency."
            },
            {
                "severity": "important",
                "title": "Verify and Test Thoroughly",
                "guidance": "AI-generated code can contain subtle bugs. Test extensively, especially for statistical analyses."
            },
            {
                "severity": "recommended",
                "title": "Include in Methods Section",
                "guidance": "Mention AI assistance in your methods section and supplementary materials."
            }
        ],
        "templates": ["code_documentation", "disclosure_statement"]
    },
    "terminal_code_internal": {
        "risk_level": "low",
        "title": "Low Risk: Internal Code",
        "summary": "AI-generated code for internal use has minimal compliance requirements.",
        "considerations": [
            {
                "severity": "recommended",
                "title": "Still Verify Code",
                "guidance": "Even for internal use, verify that AI-generated code works correctly, especially for data processing."
            },
            {
                "severity": "recommended",
                "title": "Comment Your Code",
                "guidance": "Add comments indicating AI-generated sections for future reference."
            }
        ],
        "templates": ["code_documentation"]
    },
    "terminal_code_sensitive": {
        "risk_level": "high",
        "title": "Caution: Code Processing Sensitive Data",
        "summary": "Extra care needed when AI-generated code will process sensitive data.",
        "considerations": [
            {
                "severity": "critical",
                "title": "Security Review Required",
                "guidance": "AI-generated code may have security vulnerabilities. Have it reviewed before processing sensitive data."
            },
            {
                "severity": "important",
                "title": "Don't Share Sensitive Data in Prompts",
                "guidance": "When asking AI to write code, do not include actual sensitive data in your prompts. Use synthetic examples."
            },
            {
                "severity": "important",
                "title": "Document Thoroughly",
                "guidance": "Keep detailed records of AI assistance for audit purposes."
            }
        ],
        "templates": ["code_documentation", "security_review_checklist"]
    }
}

DOCUMENT_TEMPLATES = {
    "disclosure_statement": {
        "name": "AI Use Disclosure Statement",
        "description": "For journal submissions and publications",
        "content": """## AI Assistance Disclosure

This research utilized artificial intelligence tools in the following capacity:

**AI Tool(s) Used:** {{ai_tool}}
**Version/Date:** {{ai_version}}
**Purpose:** {{purpose}}

### Scope of AI Assistance
{{scope_description}}

### Human Oversight
All AI-generated content was reviewed and verified by the authors. The authors take full responsibility for the accuracy and integrity of the work.

### Specific Uses
{{specific_uses}}

### Verification Steps
{{verification_steps}}

---
*This disclosure follows recommendations from [COPE Guidelines on AI in Publishing](https://publicationethics.org/cope-position-statements/ai-author)*"""
    },
    "reproducibility_log": {
        "name": "AI Use Reproducibility Log",
        "description": "Document AI interactions for reproducibility",
        "content": """## AI Research Reproducibility Log

**Project:** {{project_name}}
**Researcher:** {{researcher_name}}
**Date Range:** {{date_range}}

### AI Tool Information
- **Tool Name:** {{ai_tool}}
- **Version/Model:** {{ai_version}}
- **Access Method:** {{access_method}}

### Session Log

| Date | Purpose | Prompt Summary | Output Used | Verification |
|------|---------|----------------|-------------|--------------|
| {{date}} | {{purpose}} | {{prompt_summary}} | {{output_description}} | {{verification_method}} |

### Notes on AI Limitations Encountered
{{limitations_notes}}

### Verification Checklist
- [ ] All factual claims verified against primary sources
- [ ] All citations checked for accuracy
- [ ] Statistical outputs validated with alternative methods
- [ ] Code outputs tested with known inputs

---
*Log template based on research reproducibility best practices*"""
    },
    "irb_amendment": {
        "name": "IRB Amendment for AI Use",
        "description": "Template for amending IRB protocol to include AI tools",
        "content": """## IRB Protocol Amendment Request

**Protocol Number:** {{protocol_number}}
**Protocol Title:** {{protocol_title}}
**PI:** {{pi_name}}

### Purpose of Amendment
This amendment requests approval to use artificial intelligence tools as part of the research methodology.

### Description of AI Use

**AI Tool:** {{ai_tool}}
**Purpose:** {{purpose}}

### Data Handling Procedures

**Type of data to be processed with AI:**
{{data_type}}

**De-identification procedures:**
{{deidentification_procedures}}

**Data security measures:**
- Data will be de-identified before input to AI tools
- No direct identifiers will be included in prompts
- AI tool outputs will be stored securely with other research data
{{additional_security}}

### Privacy Considerations
{{privacy_considerations}}

### Risk Assessment
The use of AI tools presents the following risks and mitigations:
{{risk_assessment}}

### Consent Implications
{{consent_implications}}

---
*Submit this amendment through your institution's IRB system*"""
    },
    "ferpa_compliance_checklist": {
        "name": "FERPA Compliance Checklist for AI Use",
        "description": "Checklist for using AI with student data",
        "content": """## FERPA Compliance Checklist for AI Use

### Before Using AI with Student Data

**De-identification Requirements:**
- [ ] Student names removed
- [ ] Student ID numbers removed
- [ ] Email addresses removed
- [ ] Course section identifiers removed (if small class)
- [ ] Any unique phrases that could identify students removed
- [ ] Submission timestamps removed (if could identify)
- [ ] File metadata stripped

**Institutional Compliance:**
- [ ] Checked institutional policy on AI use
- [ ] Verified AI tool is not prohibited
- [ ] Confirmed IT security approval (if required)

**Documentation:**
- [ ] Documented de-identification process
- [ ] Kept secure copy of original data
- [ ] Recorded which AI tool was used

**Syllabus Disclosure (Recommended):**
- [ ] Informed students AI may be used for feedback/grading
- [ ] Explained how student privacy is protected
- [ ] Provided opt-out option (if feasible)

### FERPA Quick Reference
FERPA protects: Names, addresses, SSN, student ID, grades, enrollment status, class schedules, and any information that could identify a student.

*Violations can result in loss of federal funding and personal liability.*"""
    },
    "syllabus_ai_statement": {
        "name": "Syllabus AI Use Statement",
        "description": "Template statement for course syllabi",
        "content": """## AI Use in This Course

### Instructor Use of AI
{{instructor_ai_use}}

### Student Use of AI
{{student_ai_policy}}

### Privacy Protection
When AI tools are used for grading or feedback:
- All student identifying information is removed before processing
- AI tools do not retain student data
- Human review is conducted for all final grades

### Questions or Concerns
If you have questions about AI use in this course, please contact {{contact_info}}."""
    },
    "deidentification_checklist": {
        "name": "Data De-identification Checklist",
        "description": "18 HIPAA identifiers to remove",
        "content": """## HIPAA Safe Harbor De-identification Checklist

Remove ALL of the following 18 identifiers before using AI tools:

### Direct Identifiers
- [ ] Names
- [ ] Geographic data smaller than state
- [ ] Dates (except year) related to individual
- [ ] Phone numbers
- [ ] Fax numbers
- [ ] Email addresses
- [ ] Social Security numbers
- [ ] Medical record numbers
- [ ] Health plan beneficiary numbers
- [ ] Account numbers
- [ ] Certificate/license numbers
- [ ] Vehicle identifiers and serial numbers
- [ ] Device identifiers and serial numbers
- [ ] Web URLs
- [ ] IP addresses
- [ ] Biometric identifiers
- [ ] Full-face photographs
- [ ] Any other unique identifying number or code

### Additional Considerations
- [ ] Removed rare conditions/diagnoses that could identify
- [ ] Aggregated small cell sizes (n<5)
- [ ] Removed free-text fields with potential identifiers
- [ ] Verified no combination of fields could re-identify

**Note:** De-identification must be verified before each use. Data that was safe last month may not be safe today if circumstances changed."""
    },
    "code_documentation": {
        "name": "AI-Generated Code Documentation",
        "description": "Template for documenting AI assistance in code",
        "content": """## AI-Assisted Code Documentation

**Project:** {{project_name}}
**File(s):** {{file_names}}

### AI Tool Used
- **Tool:** {{ai_tool}}
- **Date:** {{date}}
- **Purpose:** {{purpose}}

### AI-Generated Sections
The following sections were generated or substantially modified with AI assistance:

{{ai_sections}}

### Human Modifications
The following modifications were made to AI-generated code:

{{human_modifications}}

### Verification
- [ ] Code reviewed for correctness
- [ ] Edge cases tested
- [ ] Output validated against known results
- [ ] Security review completed (if processing sensitive data)

### Notes
{{notes}}"""
    },
    "grant_ai_disclosure": {
        "name": "Grant Proposal AI Disclosure",
        "description": "Disclosure statement for grant applications",
        "content": """## AI Assistance Disclosure for Grant Proposal

**Proposal Title:** {{proposal_title}}
**Funding Agency:** {{funding_agency}}

### AI Tools Used
{{ai_tools_used}}

### Scope of AI Assistance
{{scope}}

### Certification
The ideas, hypotheses, and research design in this proposal represent the original intellectual work of the investigators. AI tools were used only for:
{{ai_uses}}

All content was reviewed and verified by the investigators, who take full responsibility for the proposal's accuracy and integrity.

**Investigator Signature:** ____________________
**Date:** {{date}}"""
    }
}


def get_scenarios():
    return RESEARCH_SCENARIOS


def get_decision_node(node_key):
    return DECISION_TREE.get(node_key)


def get_terminal_result(terminal_key):
    return TERMINAL_NODES.get(terminal_key)


def get_template(template_key):
    return DOCUMENT_TEMPLATES.get(template_key)


def get_all_templates():
    return DOCUMENT_TEMPLATES


def process_decision_path(answers):
    """Process a complete set of answers and return the result."""
    current_node = "start"
    path = []

    while current_node and not current_node.startswith("terminal_"):
        node = DECISION_TREE.get(current_node)
        if not node:
            break

        answer = answers.get(current_node)
        path.append({"node": current_node, "answer": answer})

        # Find next node based on answer
        next_node = None
        for option in node["options"]:
            if option["value"] == answer:
                next_node = option.get("next")
                break

        current_node = next_node

    # Get terminal result
    result = TERMINAL_NODES.get(current_node, {})
    result["path"] = path
    result["terminal_key"] = current_node

    # Get applicable templates
    templates = []
    for template_key in result.get("templates", []):
        template = DOCUMENT_TEMPLATES.get(template_key)
        if template:
            templates.append({
                "key": template_key,
                "name": template["name"],
                "description": template["description"]
            })
    result["available_templates"] = templates

    return result


def generate_document(template_key, field_values):
    """Generate a document from a template with filled values."""
    template = DOCUMENT_TEMPLATES.get(template_key)
    if not template:
        return None

    content = template["content"]
    for field, value in field_values.items():
        placeholder = "{{" + field + "}}"
        content = content.replace(placeholder, str(value))

    return {
        "name": template["name"],
        "content": content
    }
