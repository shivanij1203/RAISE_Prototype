import { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { toggleCheckpoint, logDecision, fetchProject, fetchTemplates, exportProjectCSV } from '../services/api';
import EthicsAssistant from './EthicsAssistant';
import Assessment from './Assessment';
import DocumentGenerator from './DocumentGenerator';

function ProjectDashboard({ project: initialProject, role, onBack, onProjectUpdated }) {
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState('checkpoints');
  const [showLogModal, setShowLogModal] = useState(false);
  const [newDecision, setNewDecision] = useState({ checkpoint: '', description: '', notes: '', proofType: '', proofValue: '' });
  const [expandedCheckpoint, setExpandedCheckpoint] = useState(null);
  const [saving, setSaving] = useState(false);
  const [disclosureForm, setDisclosureForm] = useState({
    aiTools: '',
    aiPurpose: '',
    humanOversight: '',
    dataHandling: ''
  });
  const [generatedDisclosure, setGeneratedDisclosure] = useState('');
  const [toast, setToast] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (activeTab === 'documents' && templates.length === 0 && !loadingTemplates) {
      setLoadingTemplates(true);
      fetchTemplates()
        .then(data => setTemplates(Array.isArray(data) ? data : []))
        .catch(err => console.error('Failed to load templates', err))
        .finally(() => setLoadingTemplates(false));
    }
  }, [activeTab]);

  // Refresh project data from API
  async function refreshProject() {
    try {
      const updated = await fetchProject(project.id);
      setProject(updated);
      if (onProjectUpdated) onProjectUpdated(updated);
    } catch (err) {
      console.error('Failed to refresh project', err);
    }
  }

  function getExampleForCheckpoint(checkpointId) {
    const examples = {
      'irb': 'e.g., IRB protocol #2024-0123 approved on 01/15/2024 includes AI analysis methods',
      'data_classification': 'e.g., Data classified as Confidential - contains de-identified health records',
      'ai_disclosure': 'e.g., Will include AI disclosure in methods section per journal requirements',
      'data_deidentified': 'e.g., Removed all 18 HIPAA identifiers using Safe Harbor method',
      'data_storage': 'e.g., Data stored on institutional secure server with encryption at rest',
      'bias_audit': 'e.g., Tested model across age groups - no significant performance disparities found',
      'human_review': 'e.g., Two reviewers validate 20% random sample of AI outputs weekly',
      'ai_coding_disclosure': 'e.g., Used GPT-4 for initial theme suggestions, all codes verified by research team',
      'participant_consent': 'e.g., Consent form v2.1 updated to include AI processing disclosure',
      'ai_writing_disclosure': 'e.g., Used Grammarly and ChatGPT for grammar/clarity edits only'
    };
    return examples[checkpointId] || 'e.g., Describe what action was taken';
  }

  async function handleCheckpointToggle(checkpointId) {
    setSaving(true);
    try {
      const result = await toggleCheckpoint(project.id, checkpointId);
      // Update local state
      const updatedCheckpoints = project.checkpoints.map(cp =>
        cp.id === checkpointId
          ? { ...cp, completed: result.completed, completedAt: result.completedAt }
          : cp
      );
      const updatedProject = { ...project, checkpoints: updatedCheckpoints };
      setProject(updatedProject);
      if (onProjectUpdated) onProjectUpdated(updatedProject);
      showToast(result.completed ? 'Checkpoint complete ✓' : 'Checkpoint unchecked');
    } catch (err) {
      console.error('Failed to toggle checkpoint', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogDecision() {
    if (!newDecision.checkpoint || !newDecision.description) return;

    setSaving(true);
    try {
      const result = await logDecision(project.id, {
        checkpoint: newDecision.checkpoint,
        description: newDecision.description,
        notes: newDecision.notes,
        proofType: newDecision.proofType || '',
        proofValue: newDecision.proofValue || '',
      });

      // Update local state with the new decision
      const newDecisionObj = {
        id: result.id,
        checkpoint: result.checkpoint,
        description: result.description,
        notes: result.notes,
        proofType: result.proofType,
        proofValue: result.proofValue,
        loggedAt: result.loggedAt,
      };

      // Update checkpoint completed status
      const updatedCheckpoints = project.checkpoints.map(cp =>
        cp.id === newDecision.checkpoint
          ? { ...cp, completed: result.checkpointCompleted, completedAt: result.checkpointCompletedAt }
          : cp
      );

      const updatedProject = {
        ...project,
        checkpoints: updatedCheckpoints,
        decisions: [newDecisionObj, ...(project.decisions || [])],
      };
      setProject(updatedProject);
      if (onProjectUpdated) onProjectUpdated(updatedProject);

      setNewDecision({ checkpoint: '', description: '', notes: '', proofType: '', proofValue: '' });
      setShowLogModal(false);
    } catch (err) {
      console.error('Failed to log decision', err);
      alert('Error saving decision. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportCSV() {
    try {
      const blob = await exportProjectCSV(project.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_compliance.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
  }

  function generateReport() {
    const completedCount = project.checkpoints.filter(c => c.completed).length;
    const totalCount = project.checkpoints.length;
    const pendingCount = totalCount - completedCount;
    const pct = getCompletionPercentage();
    const risk = getRiskAssessment();
    const decisions = project.decisions || [];

    const useCaseLabels = {
      'data_analysis': 'Quantitative Data Analysis',
      'qualitative': 'Qualitative Analysis',
      'ml_model': 'ML Model Development',
      'literature': 'Literature Review / Synthesis',
      'writing': 'Writing Assistance',
      'other': 'Other'
    };

    const riskColors = { low: '#16a34a', medium: '#d97706', high: '#dc2626' };
    const riskLabels = {
      low: 'Low Risk — No critical compliance gaps found.',
      medium: 'Medium Risk — Some items need your attention before this project is fully compliant.',
      high: 'High Risk — Critical compliance steps are missing. Please address these urgently.'
    };

    const summaryLine = pct === 100
      ? 'All compliance steps are complete. This project has passed its ethics review.'
      : `This project is ${pct}% compliant. ${pendingCount} item${pendingCount > 1 ? 's' : ''} still need${pendingCount === 1 ? 's' : ''} attention.`;

    const categories = [...new Set(project.checkpoints.map(c => c.category))];

    const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 0;">
      <!-- HEADER -->
      <div style="background: #006747; color: #fff; padding: 32px 36px; border-radius: 0;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.7; margin-bottom: 4px;">AI Ethics Compliance Report</div>
        <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">${project.name}</div>
        <div style="font-size: 12px; opacity: 0.6; margin-top: 6px;">
          ${useCaseLabels[project.aiUseCase] || 'Not specified'} &nbsp;|&nbsp;
          Created ${new Date(project.createdAt).toLocaleDateString()} &nbsp;|&nbsp;
          Report generated ${new Date().toLocaleDateString()}
        </div>
      </div>

      <!-- AT A GLANCE -->
      <div style="padding: 28px 36px 20px;">
        <div style="font-size: 16px; font-weight: 700; color: #006747; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #006747; padding-bottom: 6px;">
          At a Glance
        </div>
        <div style="font-size: 15px; margin-bottom: 14px; color: #334155;">
          ${summaryLine}
        </div>
        <!-- Progress bar -->
        <div style="background: #e2e8f0; border-radius: 6px; height: 14px; overflow: hidden; margin-bottom: 10px;">
          <div style="background: ${pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#94a3b8'}; height: 100%; width: ${pct}%; border-radius: 6px;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 18px;">
          <span>${completedCount} of ${totalCount} steps complete</span>
          <span style="font-weight: 700; color: ${pct === 100 ? '#16a34a' : '#1e293b'};">${pct}%</span>
        </div>
        <!-- Risk + Stats row -->
        <div style="display: flex; gap: 16px; margin-bottom: 6px;">
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px;">Risk Level</div>
            <div style="font-size: 16px; font-weight: 700; color: ${riskColors[risk.overallRisk]};">${risk.overallRisk.charAt(0).toUpperCase() + risk.overallRisk.slice(1)}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${riskLabels[risk.overallRisk]}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px;">Decisions Logged</div>
            <div style="font-size: 16px; font-weight: 700;">${decisions.length}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Each decision creates a timestamped record in your audit trail.</div>
          </div>
        </div>
      </div>

      <!-- WHAT ARE COMPLIANCE CHECKPOINTS -->
      <div style="padding: 0 36px 10px;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #166534; line-height: 1.6;">
          <strong>What is this report?</strong> This document tracks whether your research project follows ethical guidelines for using AI. Each "checkpoint" is a specific step — like confirming IRB approval or planning how to disclose AI use. When all checkpoints are complete, your project meets compliance standards.
        </div>
      </div>

      <!-- CHECKPOINT DETAIL BY CATEGORY -->
      <div style="padding: 20px 36px;">
        <div style="font-size: 16px; font-weight: 700; color: #006747; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #006747; padding-bottom: 6px;">
          Compliance Checklist
        </div>
        ${categories.map(category => {
          const catCps = project.checkpoints.filter(c => c.category === category);
          const catDone = catCps.filter(c => c.completed).length;
          return `
          <div style="margin-bottom: 18px;">
            <div style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; display: flex; justify-content: space-between;">
              <span>${category}</span>
              <span style="color: #94a3b8;">${catDone}/${catCps.length}</span>
            </div>
            ${catCps.map(cp => {
              const done = cp.completed;
              const assignedLabel = cp.assignedTo === 'pi' ? 'Faculty / PI' : cp.assignedTo === 'student' ? 'Student' : 'Compliance';
              return `
              <div style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                <div style="width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; margin-top: 1px;
                  background: ${done ? '#dcfce7' : '#fef2f2'}; color: ${done ? '#16a34a' : '#dc2626'}; border: 1.5px solid ${done ? '#86efac' : '#fecaca'};">
                  ${done ? '&#10003;' : '!'}
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${cp.label}</div>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                    Assigned to: ${assignedLabel}
                    ${done && cp.completedAt ? ` &nbsp;|&nbsp; Completed: ${new Date(cp.completedAt).toLocaleDateString()}` : ''}
                    ${!done ? ' &nbsp;|&nbsp; <span style="color: #dc2626; font-weight: 600;">Pending</span>' : ''}
                  </div>
                  ${cp.what ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">${cp.what}</div>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>

      <!-- DECISION AUDIT LOG -->
      <div style="padding: 10px 36px 20px;">
        <div style="font-size: 16px; font-weight: 700; color: #006747; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #006747; padding-bottom: 6px;">
          Decision Audit Trail
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">
          Every time a team member documents what they did for a compliance step, it appears here with a timestamp — creating a permanent record.
        </div>
        ${decisions.length === 0
          ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; color: #94a3b8; text-align: center;">No decisions have been logged yet. Log decisions inside the project to build your audit trail.</div>`
          : decisions.map((d, i) => {
            const cpLabel = project.checkpoints.find(c => c.id === d.checkpoint)?.label || 'General';
            return `
            <div style="border-left: 3px solid #006747; padding: 10px 14px; margin-bottom: 10px; background: #f8fafc; border-radius: 0 6px 6px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 700; color: #006747;">${cpLabel}</span>
                <span style="font-size: 11px; color: #94a3b8;">${new Date(d.loggedAt).toLocaleDateString()} at ${new Date(d.loggedAt).toLocaleTimeString()}</span>
              </div>
              <div style="font-size: 13px; color: #334155;">${d.description}</div>
              ${d.notes ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">Note: ${d.notes}</div>` : ''}
              ${d.proofValue ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;">Evidence: ${d.proofValue}</div>` : ''}
            </div>`;
          }).join('')
        }
      </div>

      <!-- ACTION ITEMS -->
      ${pendingCount > 0 ? `
      <div style="padding: 10px 36px 20px;">
        <div style="font-size: 16px; font-weight: 700; color: #dc2626; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #dc2626; padding-bottom: 6px;">
          Action Required
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
          These steps must be completed before this project is fully compliant.
        </div>
        ${project.checkpoints.filter(c => !c.completed).map((cp, i) => `
          <div style="padding: 10px 14px; margin-bottom: 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;">
            <div style="font-size: 13px; font-weight: 600; color: #991b1b;">${i + 1}. ${cp.label}</div>
            ${cp.how ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;"><strong>How:</strong> ${cp.how}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      <!-- FOOTER -->
      <div style="background: #f1f5f9; padding: 20px 36px; margin-top: 10px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.7;">
          Generated by <strong style="color: #64748b;">ALIGN</strong> — AI Lifecycle Integrity and Governance Navigator<br/>
          University of South Florida &nbsp;|&nbsp; ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br/>
          For compliance questions, contact your IRB office.
        </div>
      </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    html2pdf().set({
      margin: 0,
      filename: `${project.name.replace(/\s+/g, '_')}_Compliance_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).from(container).save().then(() => {
      document.body.removeChild(container);
    });
  }

  function getCompletionPercentage() {
    if (!project.checkpoints || project.checkpoints.length === 0) return 0;
    const completed = project.checkpoints.filter(c => c.completed).length;
    return Math.round((completed / project.checkpoints.length) * 100);
  }

  function generateDisclosureStatement() {
    const { aiTools, aiPurpose, humanOversight, dataHandling } = disclosureForm;

    if (!aiTools || !aiPurpose) {
      alert('Please fill in at least the AI tools used and their purpose.');
      return;
    }

    const useCaseDescriptions = {
      'data_analysis': 'quantitative data analysis',
      'qualitative': 'qualitative data analysis',
      'ml_model': 'machine learning model development',
      'literature': 'literature review and synthesis',
      'writing': 'writing and editing assistance',
      'other': 'research activities'
    };

    const useCase = useCaseDescriptions[project.aiUseCase] || 'research activities';

    let statement = `AI DISCLOSURE STATEMENT

Project: ${project.name}

Use of Artificial Intelligence in This Research

This research utilized artificial intelligence tools for ${useCase}. The following disclosure is provided in accordance with research transparency guidelines.

AI Tools Used:
${aiTools}

Purpose and Scope:
${aiPurpose}`;

    if (humanOversight) {
      statement += `

Human Oversight:
${humanOversight}`;
    }

    if (dataHandling) {
      statement += `

Data Handling:
${dataHandling}`;
    }

    statement += `

---
Generated using ALIGN (AI Lifecycle Integrity and Governance Navigator)
Date: ${new Date().toLocaleDateString()}`;

    setGeneratedDisclosure(statement);
  }

  function copyDisclosure() {
    navigator.clipboard.writeText(generatedDisclosure);
    showToast('Copied to clipboard ✓');
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  }

  // Filter checkpoints based on role
  const getMyCheckpoints = () => {
    if (role === 'compliance') {
      return project.checkpoints || [];
    }
    return project.checkpoints?.filter(c => c.assignedTo === role) || [];
  };

  const myCheckpoints = getMyCheckpoints();
  const allCheckpoints = project.checkpoints || [];
  const categories = [...new Set(myCheckpoints.map(c => c.category))];

  const getMyCompletionPercentage = () => {
    if (myCheckpoints.length === 0) return 0;
    const completed = myCheckpoints.filter(c => c.completed).length;
    return Math.round((completed / myCheckpoints.length) * 100);
  };

  const completion = role === 'compliance' ? getCompletionPercentage() : getMyCompletionPercentage();

  function getRiskAssessment() {
    const risks = [];
    const checkpointsToCheck = role === 'compliance' ? allCheckpoints : myCheckpoints;
    const incompleteCheckpoints = checkpointsToCheck.filter(c => !c.completed);

    const criticalCheckpoints = ['irb', 'data_deidentified', 'participant_consent'];
    const incompleteCritical = incompleteCheckpoints.filter(c => criticalCheckpoints.includes(c.id));

    if (incompleteCritical.length > 0) {
      risks.push({
        level: 'high',
        message: `${incompleteCritical.length} critical compliance item(s) pending`,
        items: incompleteCritical.map(c => c.label)
      });
    }

    const mediumCheckpoints = ['bias_audit', 'human_review', 'ai_disclosure'];
    const incompleteMedium = incompleteCheckpoints.filter(c => mediumCheckpoints.includes(c.id));

    if (incompleteMedium.length > 0) {
      risks.push({
        level: 'medium',
        message: `${incompleteMedium.length} transparency/quality item(s) pending`,
        items: incompleteMedium.map(c => c.label)
      });
    }

    let overallRisk = 'low';
    if (risks.some(r => r.level === 'high')) {
      overallRisk = 'high';
    } else if (risks.some(r => r.level === 'medium') || completion < 50) {
      overallRisk = 'medium';
    }

    return { overallRisk, risks, completion };
  }

  const riskAssessment = getRiskAssessment();

  return (
    <div className="project-dashboard">
      {toast && <div className="toast-notification">{toast}</div>}
      <header className="project-dashboard-header">
        <div className="header-top-row">
          <button className="back-btn" onClick={onBack}>&larr; Back to Projects</button>
          <span className={`role-badge role-${role}`}>
            {role === 'pi' ? 'Principal Investigator' :
             role === 'student' ? 'Student Researcher' :
             'Compliance Officer'}
          </span>
        </div>
        <div className="header-main-row">
          <div className="project-title-section">
            <h1>{project.name}</h1>
            <p className="project-meta">
              Created {new Date(project.createdAt).toLocaleDateString()} &bull; {project.description || 'No description'}
            </p>
          </div>
          <div className="header-report-actions">
            <button className="btn-secondary" onClick={handleExportCSV}>
              Export CSV
            </button>
            <button className="btn-primary" onClick={generateReport}>
              {role === 'compliance' ? 'Generate Audit Report' :
               role === 'student' ? 'Generate Draft Report' :
               'Generate Report'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Overview */}
      <div className="progress-overview">
        <div className="progress-circle">
          <svg viewBox="0 0 100 100">
            <circle className="progress-bg" cx="50" cy="50" r="45" />
            <circle
              className="progress-fill"
              cx="50"
              cy="50"
              r="45"
              strokeDasharray={`${completion * 2.83} 283`}
            />
          </svg>
          <div className="progress-text">
            <span className="progress-number">{completion}%</span>
            <span className="progress-label">{role === 'compliance' ? 'Complete' : 'Your Tasks'}</span>
          </div>
        </div>
        <div className="progress-stats">
          <div className="stat">
            <span className="stat-value">{myCheckpoints.filter(c => c.completed).length}</span>
            <span className="stat-label">{role === 'compliance' ? 'Documented' : 'Your Tasks Done'}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{myCheckpoints.length}</span>
            <span className="stat-label">{role === 'compliance' ? 'Total Items' : 'Your Total Tasks'}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{project.decisions?.length || 0}</span>
            <span className="stat-label">Decisions Logged</span>
          </div>
          {role !== 'compliance' && (
            <div className="stat overall-stat">
              <span className="stat-value">{getCompletionPercentage()}%</span>
              <span className="stat-label">Overall Project</span>
            </div>
          )}
        </div>
        <div className={`risk-assessment risk-${riskAssessment.overallRisk}`}>
          <div className="risk-header">
            <span className="risk-level">
              {riskAssessment.overallRisk === 'high' ? 'High Risk' :
               riskAssessment.overallRisk === 'medium' ? 'Medium Risk' :
               'Low Risk'}
            </span>
          </div>
          {riskAssessment.risks.length > 0 ? (
            <ul className="risk-items">
              {riskAssessment.risks.map((risk, idx) => (
                <li key={idx} className={`risk-item risk-${risk.level}`}>
                  {risk.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="risk-clear">All critical items addressed</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'checkpoints' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkpoints')}
        >
          {role === 'compliance' ? 'Compliance Status' : 'Checkpoints'}
        </button>
        <button
          className={`tab ${activeTab === 'decisions' ? 'active' : ''}`}
          onClick={() => setActiveTab('decisions')}
        >
          {role === 'compliance' ? 'Audit Trail' : 'Decision Log'} ({project.decisions?.length || 0})
        </button>
        {role !== 'compliance' && (
          <button
            className={`tab ${activeTab === 'disclosure' ? 'active' : ''}`}
            onClick={() => setActiveTab('disclosure')}
          >
            Disclosure Generator
          </button>
        )}
        <button
          className={`tab ${activeTab === 'ethics' ? 'active' : ''}`}
          onClick={() => setActiveTab('ethics')}
        >
          Ethics Assistant
        </button>
        <button
          className={`tab ${activeTab === 'assessment' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessment')}
        >
          Assessment
        </button>
        <button
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => { setSelectedTemplate(null); setActiveTab('documents'); }}
        >
          Documents
        </button>
      </div>

      {/* Checkpoints Tab */}
      {activeTab === 'checkpoints' && (
        <div className="checkpoints-section">
          <div className="section-header">
            <h2>Compliance Checkpoints</h2>
          </div>

          {role === 'compliance' ? (
            <div className="checkpoints-explainer compliance-view">
              <div className="explainer-content">
                <strong>Audit View - Read Only</strong>
                <p>Reviewing compliance status and documentation. Contact the PI to request changes.</p>
              </div>
              <div className="explainer-status">
                <span className={`status-badge ${completion === 100 ? 'complete' : completion > 0 ? 'in-progress' : 'not-started'}`}>
                  {completion}% Documented
                </span>
              </div>
            </div>
          ) : role === 'student' ? (
            <div className="checkpoints-explainer student-view">
              <div className="explainer-content">
                <strong>Complete each checkpoint by documenting your work</strong>
                <p>Click "Guide" on any checkpoint to learn what it means and how to complete it. Your PI will review your documentation.</p>
              </div>
              <div className="explainer-status">
                <span className={`status-badge ${completion === 100 ? 'complete' : completion > 0 ? 'in-progress' : 'not-started'}`}>
                  {completion === 100 ? 'All Complete' :
                   completion > 0 ? `${myCheckpoints.filter(c => c.completed).length}/${myCheckpoints.length} Done` :
                   'Not Started'}
                </span>
              </div>
            </div>
          ) : (
            <div className="checkpoints-explainer">
              <div className="explainer-content">
                <strong>Document each checkpoint to mark it complete</strong>
                <p>Click "Document" to log decisions and create an audit trail for compliance records.</p>
              </div>
              <div className="explainer-status">
                <span className={`status-badge ${completion === 100 ? 'complete' : completion > 0 ? 'in-progress' : 'not-started'}`}>
                  {completion === 100 ? 'All Complete' :
                   completion > 0 ? `${myCheckpoints.filter(c => c.completed).length}/${myCheckpoints.length} Done` :
                   'Not Started'}
                </span>
              </div>
            </div>
          )}

          {categories.map(category => (
            <div key={category} className="checkpoint-category">
              <h3 className="category-title">{category}</h3>
              <div className="checkpoint-list">
                {myCheckpoints
                  .filter(c => c.category === category)
                  .map(checkpoint => (
                    <div
                      key={checkpoint.id}
                      className={`checkpoint-item ${checkpoint.completed ? 'completed' : 'pending'} ${expandedCheckpoint === checkpoint.id ? 'expanded' : ''}`}
                    >
                      <div className="checkpoint-main">
                        <div className="checkpoint-status-icon">
                          {checkpoint.completed ? (
                            <span className="status-complete">{'\u2713'}</span>
                          ) : (
                            <span className="status-pending">{'\u25CB'}</span>
                          )}
                        </div>
                        <div className="checkpoint-content">
                          <span className="checkpoint-label">{checkpoint.label}</span>
                          {checkpoint.completed ? (
                            <span className="checkpoint-date completed-date">
                              Documented {new Date(checkpoint.completedAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="checkpoint-date pending-date">
                              Requires documentation
                            </span>
                          )}
                        </div>
                        {(role === 'student' || !checkpoint.what) ? null : (
                          <button
                            className="help-btn"
                            onClick={() => setExpandedCheckpoint(expandedCheckpoint === checkpoint.id ? null : checkpoint.id)}
                            title="Learn more about this checkpoint"
                          >
                            {expandedCheckpoint === checkpoint.id ? 'Hide' : 'Info'}
                          </button>
                        )}
                        {role === 'student' && (
                          <button
                            className="help-btn always-visible"
                            onClick={() => setExpandedCheckpoint(expandedCheckpoint === checkpoint.id ? null : checkpoint.id)}
                            title="Learn what this means"
                          >
                            {expandedCheckpoint === checkpoint.id ? 'Hide' : 'Guide'}
                          </button>
                        )}
                        {role !== 'compliance' && !checkpoint.completed && (
                          <button
                            className="log-btn primary"
                            onClick={() => {
                              setNewDecision({ ...newDecision, checkpoint: checkpoint.id });
                              setShowLogModal(true);
                            }}
                            title="Document this checkpoint"
                          >
                            Document
                          </button>
                        )}
                        {role !== 'compliance' && checkpoint.completed && (
                          <>
                            <button
                              className="log-btn secondary"
                              onClick={() => {
                                setNewDecision({ ...newDecision, checkpoint: checkpoint.id });
                                setShowLogModal(true);
                              }}
                              title="Add another decision"
                            >
                              + Add Note
                            </button>
                            <button
                              className="log-btn undo"
                              onClick={() => handleCheckpointToggle(checkpoint.id)}
                              disabled={saving}
                              title="Mark as incomplete"
                            >
                              Undo
                            </button>
                          </>
                        )}
                        {role === 'compliance' && (
                          <span className="compliance-status-label">
                            {checkpoint.completed ? 'Documented' : 'Pending'}
                          </span>
                        )}
                      </div>
                      {expandedCheckpoint === checkpoint.id && checkpoint.what && (
                        <div className="checkpoint-help">
                          <div className="help-section">
                            <strong>What:</strong>
                            <p>{checkpoint.what}</p>
                          </div>
                          <div className="help-section">
                            <strong>Why it matters:</strong>
                            <p>{checkpoint.why}</p>
                          </div>
                          <div className="help-section">
                            <strong>How to complete:</strong>
                            <p>{checkpoint.how}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decisions Tab */}
      {activeTab === 'decisions' && (
        <div className="decisions-section">
          <div className="section-header">
            <h2>Decision Log</h2>
          </div>

          {(!project.decisions || project.decisions.length === 0) ? (
            <div className="empty-decisions">
              <p>No decisions logged yet. Use the "Document" button on each checkpoint to build your audit trail.</p>
            </div>
          ) : (
            <div className="decisions-timeline">
              {project.decisions.map(decision => (
                <div key={decision.id} className="decision-item">
                  <div className="decision-date">
                    {new Date(decision.loggedAt).toLocaleDateString()}
                  </div>
                  <div className="decision-content">
                    <span className="decision-checkpoint">
                      {project.checkpoints?.find(c => c.id === decision.checkpoint)?.label || 'General'}
                    </span>
                    <p className="decision-description">{decision.description}</p>
                    {decision.notes && (
                      <p className="decision-notes">{decision.notes}</p>
                    )}
                    {decision.proofType && decision.proofValue && (
                      <div className="decision-proof">
                        {decision.proofType === 'url' ? (
                          <a href={decision.proofValue} target="_blank" rel="noopener noreferrer" className="proof-link">
                            Link: {decision.proofValue}
                          </a>
                        ) : (
                          <span className="proof-file">File: {decision.proofValue}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disclosure Generator Tab */}
      {activeTab === 'disclosure' && (
        <div className="disclosure-section">
          <div className="section-header">
            <h2>AI Disclosure Statement Generator</h2>
          </div>

          <div className="disclosure-explainer">
            <p>
              Most journals and institutions now require disclosure of AI use in research.
              Fill in the details below to generate a disclosure statement you can include
              in your papers, grant applications, or IRB submissions.
            </p>
          </div>

          <div className="disclosure-form">
            <div className="form-group">
              <label>AI Tools Used *</label>
              <textarea
                value={disclosureForm.aiTools}
                onChange={(e) => setDisclosureForm({ ...disclosureForm, aiTools: e.target.value })}
                placeholder="e.g., ChatGPT (GPT-4), Python scikit-learn library, Google Cloud Vision API"
                rows={2}
              />
              <p className="form-hint">List all AI tools, models, or services used in this research</p>
            </div>

            <div className="form-group">
              <label>Purpose and How AI Was Used *</label>
              <textarea
                value={disclosureForm.aiPurpose}
                onChange={(e) => setDisclosureForm({ ...disclosureForm, aiPurpose: e.target.value })}
                placeholder="e.g., AI was used to assist with initial coding of interview transcripts. All AI-generated codes were reviewed and validated by two human researchers. Final themes were determined through researcher consensus."
                rows={4}
              />
              <p className="form-hint">Describe specifically what the AI did and what it did not do</p>
            </div>

            <div className="form-group">
              <label>Human Oversight Process</label>
              <textarea
                value={disclosureForm.humanOversight}
                onChange={(e) => setDisclosureForm({ ...disclosureForm, humanOversight: e.target.value })}
                placeholder="e.g., All AI outputs were reviewed by the research team. AI suggestions were accepted, modified, or rejected based on domain expertise."
                rows={3}
              />
              <p className="form-hint">How did humans review, validate, or modify AI outputs?</p>
            </div>

            <div className="form-group">
              <label>Data Handling</label>
              <textarea
                value={disclosureForm.dataHandling}
                onChange={(e) => setDisclosureForm({ ...disclosureForm, dataHandling: e.target.value })}
                placeholder="e.g., No identifiable participant data was shared with AI services. All data was de-identified before processing."
                rows={2}
              />
              <p className="form-hint">How was data privacy maintained when using AI?</p>
            </div>

            <button className="btn-primary" onClick={generateDisclosureStatement}>
              Generate Disclosure Statement
            </button>
          </div>

          {generatedDisclosure && (
            <div className="generated-disclosure">
              <div className="disclosure-header">
                <h3>Generated Disclosure Statement</h3>
                <button className="btn-secondary" onClick={copyDisclosure}>
                  Copy to Clipboard
                </button>
              </div>
              <pre className="disclosure-text">{generatedDisclosure}</pre>
            </div>
          )}
        </div>
      )}

      {/* Ethics Assistant Tab */}
      {activeTab === 'ethics' && (
        <div className="ethics-tab-section">
          <EthicsAssistant onBack={() => setActiveTab('checkpoints')} />
        </div>
      )}

      {/* Assessment Tab */}
      {activeTab === 'assessment' && (
        <div className="assessment-tab-section">
          <Assessment onBack={() => setActiveTab('checkpoints')} />
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="documents-section">
          {selectedTemplate ? (
            <DocumentGenerator
              templateKey={selectedTemplate.key}
              templateName={selectedTemplate.name}
              onBack={() => setSelectedTemplate(null)}
            />
          ) : (
            <>
              <div className="section-header">
                <h2>Document Templates</h2>
              </div>
              <div className="documents-explainer">
                <p>Generate compliance documents — IRB amendments, FERPA checklists, and disclosure statements — tailored for your research context.</p>
              </div>
              {loadingTemplates ? (
                <div className="loading">Loading templates...</div>
              ) : (
                <div className="templates-grid">
                  {templates.map(template => (
                    <div
                      key={template.key}
                      className="template-card"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="template-icon">📄</div>
                      <h3>{template.name}</h3>
                      <p>{template.description}</p>
                      <button className="btn-secondary template-btn">Generate →</button>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <p className="empty-templates">No templates available.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Document Checkpoint Modal */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Document Checkpoint</h2>
            <p className="modal-subtitle">
              {project.checkpoints?.find(c => c.id === newDecision.checkpoint)?.label}
            </p>

            <div className="form-group">
              <label>What was done? *</label>
              <input
                type="text"
                value={newDecision.description}
                onChange={(e) => setNewDecision({ ...newDecision, description: e.target.value })}
                placeholder={getExampleForCheckpoint(newDecision.checkpoint)}
              />
            </div>

            <div className="form-group">
              <label>Additional Notes (optional)</label>
              <textarea
                value={newDecision.notes}
                onChange={(e) => setNewDecision({ ...newDecision, notes: e.target.value })}
                placeholder="Any additional context, reference numbers, dates..."
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Attach Evidence (optional)</label>
              <select
                value={newDecision.proofType}
                onChange={(e) => setNewDecision({ ...newDecision, proofType: e.target.value, proofValue: '' })}
                className="proof-type-select"
              >
                <option value="">No attachment</option>
                <option value="url">URL / Link</option>
                <option value="file">File Reference</option>
              </select>
            </div>

            {newDecision.proofType === 'url' && (
              <div className="form-group">
                <label>URL</label>
                <input
                  type="url"
                  value={newDecision.proofValue}
                  onChange={(e) => setNewDecision({ ...newDecision, proofValue: e.target.value })}
                  placeholder="https://example.com/irb-approval.pdf"
                />
                <p className="form-hint">Link to document, approval letter, or supporting evidence</p>
              </div>
            )}

            {newDecision.proofType === 'file' && (
              <div className="form-group">
                <label>File Reference</label>
                <input
                  type="text"
                  value={newDecision.proofValue}
                  onChange={(e) => setNewDecision({ ...newDecision, proofValue: e.target.value })}
                  placeholder="IRB_Approval_2024.pdf (in project folder)"
                />
                <p className="form-hint">Name and location of the file for reference</p>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLogModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleLogDecision}
                disabled={!newDecision.checkpoint || !newDecision.description || saving}
              >
                {saving ? 'Saving...' : 'Save Documentation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDashboard;
