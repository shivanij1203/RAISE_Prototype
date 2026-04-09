"""Seed the Tool Library with AI tools, productivity tools, and compliance guidance."""
from django.core.management.base import BaseCommand

from api.models import AITool

SEED_TOOLS = [
    {
        'name': 'ChatGPT',
        'vendor': 'OpenAI',
        'category': 'chatbot',
        'description': 'General-purpose conversational assistant for text generation, analysis, coding, and brainstorming.',
        'status': 'approved',
        'retains_data': True,
        'data_retention_details': 'Conversations are stored by default. Users can disable training on their data in settings. Enterprise/Team plans offer no-training guarantees and SOC 2 compliance.',
        'sends_to_third_party': True,
        'hipaa_compliant': False,
        'ferpa_compliant': False,
        'has_enterprise_plan': True,
        'risk_notes': 'Default plan retains all conversations for model training. Never paste student PII, patient data, or confidential research data without enterprise plan and data processing agreement.',
        'recommended_use_cases': ['writing', 'literature', 'qualitative', 'teaching'],
        'compliance_guidance': {
            'grading': 'Do NOT paste student names, IDs, or identifiable work. Use anonymized excerpts only. Consider the API with data retention disabled instead of the web interface.',
            'qualitative': 'De-identify all interview transcripts before pasting. Remove names, locations, and identifying details. Use the API with zero-retention if processing sensitive research data.',
            'writing': 'Safe for grammar and editing assistance. Disclose usage in your methods section per journal requirements. Do not paste unpublished research findings.',
            'literature': 'Useful for summarizing papers, but verify all citations — it can generate plausible but non-existent references. Cross-check every source.',
            'teaching': 'Can generate course materials, but review for accuracy. Disclose to students that materials were assisted by this tool.',
            'data_analysis': 'Do not upload datasets containing PII. Use anonymized or synthetic data only. The Advanced Data Analysis feature processes files on OpenAI servers.',
            'admin': 'Do not paste applicant data, employee records, or any personally identifiable information. Use only for drafting general policy language or templates.',
        },
    },
    {
        'name': 'GitHub Copilot',
        'vendor': 'GitHub / Microsoft',
        'category': 'code_assistant',
        'description': 'Code completion and generation tool integrated into IDEs. Suggests code as you type based on context.',
        'status': 'approved',
        'retains_data': False,
        'data_retention_details': 'Business plan does not retain code snippets or use them for training. Individual plan may use snippets for model improvement.',
        'sends_to_third_party': True,
        'hipaa_compliant': False,
        'ferpa_compliant': True,
        'has_enterprise_plan': True,
        'risk_notes': 'Code context is sent to GitHub servers for completion. Business plan offers IP indemnity and no code retention. Do not use with repositories containing secrets or credentials.',
        'recommended_use_cases': ['data_analysis', 'ml_model'],
        'compliance_guidance': {
            'data_analysis': 'Safe for writing analysis scripts. Do not include hardcoded credentials or API keys in your code. Ensure .env files are gitignored.',
            'ml_model': 'Useful for boilerplate code generation. Review all generated code for correctness — it can produce plausible but incorrect implementations. Document usage in your methodology.',
        },
    },
    {
        'name': 'Grammarly',
        'vendor': 'Grammarly Inc.',
        'category': 'writing',
        'description': 'Writing assistant for grammar, clarity, and style improvements. Available as browser extension and desktop app.',
        'status': 'approved',
        'retains_data': True,
        'data_retention_details': 'Text is processed on Grammarly servers. Enterprise plan offers enhanced data controls and SOC 2 compliance. Free/Premium plans may use text for product improvement.',
        'sends_to_third_party': True,
        'hipaa_compliant': False,
        'ferpa_compliant': False,
        'has_enterprise_plan': True,
        'risk_notes': 'All text typed in the browser extension is sent to Grammarly servers. Disable the extension when working with student records, patient data, or confidential content.',
        'recommended_use_cases': ['writing', 'teaching'],
        'compliance_guidance': {
            'writing': 'Safe for grammar and style editing of your own writing. Disable the extension when reviewing student submissions or confidential documents.',
            'teaching': 'Can be used for polishing course materials. Disable when grading or reviewing student work to avoid sending student content to Grammarly servers.',
            'grading': 'NOT recommended for grading. Disable the browser extension before opening any student submissions to prevent their work from being transmitted.',
        },
    },
    {
        'name': 'Midjourney',
        'vendor': 'Midjourney Inc.',
        'category': 'image_gen',
        'description': 'Image generation tool accessed through Discord or the web app. Creates images from text prompts.',
        'status': 'under_review',
        'retains_data': True,
        'data_retention_details': 'All generated images are public by default on the free plan. Paid plans offer private generation. Prompts and images are stored on Midjourney servers.',
        'sends_to_third_party': True,
        'hipaa_compliant': False,
        'ferpa_compliant': False,
        'has_enterprise_plan': False,
        'risk_notes': 'Generated images are public by default. Do not include identifying information in prompts. Not suitable for any use case involving personal data.',
        'recommended_use_cases': ['teaching'],
        'compliance_guidance': {
            'teaching': 'Can generate illustrations for course materials. Ensure prompts do not reference real individuals. Disclose AI-generated imagery to students.',
        },
    },
    {
        'name': 'Claude',
        'vendor': 'Anthropic',
        'category': 'chatbot',
        'description': 'Conversational assistant focused on helpfulness, harmlessness, and honesty. Available via web and API.',
        'status': 'approved',
        'retains_data': True,
        'data_retention_details': 'Free plan conversations may be used for training. Pro plan offers opt-out. API usage is not used for training by default.',
        'sends_to_third_party': True,
        'hipaa_compliant': False,
        'ferpa_compliant': False,
        'has_enterprise_plan': True,
        'risk_notes': 'Similar data handling concerns as other chatbots. API with zero-retention is the safest option for research data. Enterprise plan available with custom data agreements.',
        'recommended_use_cases': ['writing', 'literature', 'qualitative', 'teaching'],
        'compliance_guidance': {
            'qualitative': 'De-identify transcripts before analysis. API with zero-retention is preferred for research use. Do not paste participant identifiers.',
            'writing': 'Safe for editing and drafting. Disclose usage per journal policy.',
            'literature': 'Good for synthesis and summarization. Always verify citations independently.',
            'teaching': 'Useful for generating discussion questions, rubrics, and explanations. Review output for accuracy before distribution.',
        },
    },
    {
        'name': 'Google Gemini',
        'vendor': 'Google',
        'category': 'chatbot',
        'description': 'Multimodal assistant that can process text, images, and documents. Integrated with Google Workspace.',
        'status': 'approved',
        'retains_data': True,
        'data_retention_details': 'Consumer conversations are reviewed by humans and used for training. Workspace plans with Gemini for Google Workspace have different data handling terms.',
        'sends_to_third_party': True,
        'hipaa_compliant': False,
        'ferpa_compliant': False,
        'has_enterprise_plan': True,
        'risk_notes': 'Consumer version conversations may be reviewed by human annotators. Use the Workspace enterprise version for any institutional data.',
        'recommended_use_cases': ['writing', 'literature', 'teaching'],
        'compliance_guidance': {
            'writing': 'Safe for general writing tasks. Avoid pasting confidential research data in the consumer version.',
            'teaching': 'Useful for generating materials. Workspace version is preferred for institutional use.',
            'literature': 'Can summarize and analyze papers. Verify all factual claims.',
        },
    },
    {
        'name': 'Turnitin',
        'vendor': 'Turnitin LLC',
        'category': 'grading',
        'description': 'Plagiarism detection and writing assessment platform widely used in higher education.',
        'status': 'approved',
        'retains_data': True,
        'data_retention_details': 'Student submissions are stored in the Turnitin database for comparison against future submissions. Institutional agreements govern data handling.',
        'sends_to_third_party': True,
        'hipaa_compliant': False,
        'ferpa_compliant': True,
        'has_enterprise_plan': True,
        'risk_notes': 'Turnitin has specific FERPA compliance agreements with institutions. Ensure your institution has a current data processing agreement in place.',
        'recommended_use_cases': ['grading'],
        'compliance_guidance': {
            'grading': 'Use through your institutional LMS integration (Canvas, Blackboard). Students should be informed that submissions are checked. Ensure your institution has a current Turnitin agreement.',
        },
    },
    {
        'name': 'NotebookLM',
        'vendor': 'Google',
        'category': 'research',
        'description': 'Research assistant that lets you upload sources (papers, PDFs, notes) and ask questions grounded in your own material. Generates summaries, study guides, and audio overviews from uploaded documents.',
        'status': 'approved',
        'retains_data': True,
        'data_retention_details': 'Uploaded sources are stored in your Google account. Google states that NotebookLM does not use your data to train models. Data handling is subject to Google Workspace or consumer account terms.',
        'sends_to_third_party': True,
        'hipaa_compliant': False,
        'ferpa_compliant': False,
        'has_enterprise_plan': True,
        'risk_notes': 'Sources you upload are processed by Google. Do not upload documents containing student PII, patient data, or unpublished confidential research without institutional data agreements in place.',
        'recommended_use_cases': ['literature', 'research', 'writing', 'teaching'],
        'compliance_guidance': {
            'literature': 'Upload published papers and ask synthesis questions. Responses are grounded in your sources, reducing hallucination risk. Always verify citations against originals.',
            'research': 'Useful for exploring your own research corpus. Do not upload IRB-restricted data or identifiable participant information. Stick to published or de-identified materials.',
            'writing': 'Can help outline papers and identify gaps in your argument based on uploaded sources. Disclose usage per journal or institutional policy.',
            'teaching': 'Upload course readings to generate study guides or discussion questions for students. Review generated content for accuracy before distributing.',
        },
    },
    # ---- Productivity & Research Tools ----
    {
        'name': 'Qualtrics',
        'vendor': 'Qualtrics International',
        'tool_type': 'general',
        'category': 'survey',
        'description': 'Survey and experience management platform for research data collection, course evaluations, and institutional assessments.',
        'status': 'approved',
        'website_url': 'https://www.qualtrics.com',
        'retains_data': True,
        'ferpa_compliant': True,
        'hipaa_compliant': True,
        'has_enterprise_plan': True,
        'data_retention_details': 'Data stored on Qualtrics servers with institutional data agreements. USF provides institutional licenses.',
        'recommended_use_cases': ['research', 'qualitative', 'teaching', 'admin'],
        'compliance_guidance': {
            'research': 'Use institutional Qualtrics account for IRB-approved research. Enable anonymization features for sensitive surveys. Ensure consent language is included at the start of every survey.',
            'qualitative': 'Ideal for collecting open-ended responses. Use anonymous links to protect participant identity. Export data securely and store per IRB data management plan.',
            'teaching': 'Great for course evaluations and student feedback. Use anonymous collection to encourage honest responses.',
            'admin': 'Use for departmental surveys and needs assessments. Ensure responses are anonymized when reporting results.',
        },
    },
    {
        'name': 'SPSS',
        'vendor': 'IBM',
        'tool_type': 'general',
        'category': 'statistics',
        'description': 'Statistical analysis software for descriptive statistics, regression, ANOVA, factor analysis, and more. Widely used in social science research.',
        'status': 'approved',
        'website_url': 'https://www.ibm.com/spss',
        'retains_data': False,
        'ferpa_compliant': True,
        'hipaa_compliant': True,
        'has_enterprise_plan': True,
        'data_retention_details': 'Desktop application — data stays on your local machine. No cloud transmission unless using SPSS cloud features.',
        'recommended_use_cases': ['data_analysis', 'research', 'qualitative'],
        'compliance_guidance': {
            'data_analysis': 'Data is processed locally. Ensure datasets with PII are stored on encrypted drives. Use codebooks to de-identify variables.',
            'research': 'Standard tool for quantitative analysis. Keep raw data files separate from analysis files. Back up to institutional secure storage.',
        },
    },
    {
        'name': 'NVivo',
        'vendor': 'Lumivero',
        'tool_type': 'general',
        'category': 'qualitative',
        'description': 'Qualitative data analysis software for coding interviews, focus groups, documents, and multimedia. Supports thematic and content analysis.',
        'status': 'approved',
        'website_url': 'https://lumivero.com/products/nvivo/',
        'retains_data': False,
        'ferpa_compliant': True,
        'hipaa_compliant': True,
        'has_enterprise_plan': True,
        'data_retention_details': 'Desktop application — all data stays local. NVivo Collaboration Cloud is optional and has separate data handling terms.',
        'recommended_use_cases': ['qualitative', 'research'],
        'compliance_guidance': {
            'qualitative': 'Ideal for coding and thematic analysis. Store project files on encrypted drives. De-identify transcripts before importing if required by IRB.',
            'research': 'Supports mixed methods research. Use consistent coding frameworks. Keep audit trails for methodological rigor.',
        },
    },
    {
        'name': 'Zotero',
        'vendor': 'Corporation for Digital Scholarship',
        'tool_type': 'general',
        'category': 'reference',
        'description': 'Free reference management tool for collecting, organizing, and citing research sources. Browser extension captures references from databases.',
        'status': 'approved',
        'website_url': 'https://www.zotero.org',
        'retains_data': True,
        'ferpa_compliant': True,
        'hipaa_compliant': False,
        'has_enterprise_plan': False,
        'data_retention_details': 'References synced to Zotero cloud (300 MB free). PDFs and files can be stored locally or synced. No sensitive data typically involved.',
        'recommended_use_cases': ['literature', 'writing', 'research'],
        'compliance_guidance': {
            'literature': 'Essential for organizing literature reviews. Use group libraries for collaborative research. Export citations in any format for your papers.',
            'writing': 'Integrates with Word and Google Docs for inline citations. Keeps your bibliography consistent across documents.',
        },
    },
    {
        'name': 'Overleaf',
        'vendor': 'Digital Science',
        'tool_type': 'general',
        'category': 'collaboration',
        'description': 'Online LaTeX editor for collaborative academic writing. Real-time co-editing with built-in templates for journals and conferences.',
        'status': 'approved',
        'website_url': 'https://www.overleaf.com',
        'retains_data': True,
        'ferpa_compliant': False,
        'hipaa_compliant': False,
        'has_enterprise_plan': True,
        'data_retention_details': 'Documents stored on Overleaf servers. Premium plans available through institutional licenses. Projects can be downloaded as .tex files anytime.',
        'recommended_use_cases': ['writing', 'research'],
        'compliance_guidance': {
            'writing': 'Ideal for collaborative papers and theses. Do not include raw datasets with PII in your LaTeX projects — use aggregated results only.',
            'research': 'Use for manuscript preparation. Share projects with co-authors using institutional email addresses for traceability.',
        },
    },
    {
        'name': 'Tableau',
        'vendor': 'Salesforce',
        'tool_type': 'general',
        'category': 'visualization',
        'description': 'Interactive data visualization platform for creating dashboards and visual analytics. Free academic licenses available.',
        'status': 'approved',
        'website_url': 'https://www.tableau.com',
        'retains_data': True,
        'ferpa_compliant': False,
        'hipaa_compliant': False,
        'has_enterprise_plan': True,
        'data_retention_details': 'Tableau Desktop processes locally. Tableau Public publishes visualizations publicly. Tableau Server/Online offers institutional hosting.',
        'recommended_use_cases': ['data_analysis', 'research', 'admin'],
        'compliance_guidance': {
            'data_analysis': 'Use Tableau Desktop for working with sensitive data — it stays local. Never publish PII-containing dashboards to Tableau Public.',
            'research': 'Great for exploratory data analysis and presenting findings. Use anonymized datasets for any shared dashboards.',
            'admin': 'Useful for departmental reporting and enrollment analytics. Ensure student-level data is aggregated before sharing dashboards.',
        },
    },
]


class Command(BaseCommand):
    help = 'Seed the Tool Library with AI tools, productivity tools, and compliance guidance'

    def handle(self, *args, **options) -> None:
        created_count = 0
        updated_count = 0

        for tool_data in SEED_TOOLS:
            tool, created = AITool.objects.get_or_create(
                name=tool_data['name'],
                defaults=tool_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {tool.name}'))
            else:
                # Update existing tool with new fields
                for key, value in tool_data.items():
                    if key != 'name':
                        setattr(tool, key, value)
                tool.save()
                updated_count += 1
                self.stdout.write(f'  Updated: {tool.name}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone: {created_count} created, {updated_count} updated'
        ))
