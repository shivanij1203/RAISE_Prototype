import { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { toggleCheckpoint, logDecision, fetchProject } from '../services/api';
import EthicsAssistant from './EthicsAssistant';
import Assessment from './Assessment';
import CheckpointComments from './CheckpointComments';

function ProjectDashboard({ project: initialProject, role, onBack, onProjectUpdated }) {
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState('checkpoints');
  const [showLogModal, setShowLogModal] = useState(false);
  const [newDecision, setNewDecision] = useState({ checkpoint: '', description: '', notes: '', proofType: '', proofValue: '' });
  const [expandedCheckpoint, setExpandedCheckpoint] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [ethicsReviewPhase, setEthicsReviewPhase] = useState('assistant');

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
      'ai_writing_disclosure': 'e.g., Used Grammarly and ChatGPT for grammar/clarity edits only',
      'grading_fairness': 'e.g., Compared AI grades across demographics - no statistically significant disparities',
      'ferpa_compliance': 'e.g., Confirmed student data processed only on FERPA-compliant institutional systems',
      'grading_transparency': 'e.g., Syllabus updated to disclose AI-assisted grading with opt-out provision',
      'human_override': 'e.g., Students can request manual re-grading within 7 days of grade posting',
      'grading_validation': 'e.g., Instructor reviewed 25% random sample - 96% agreement with AI grades',
      'content_accuracy': 'e.g., All AI-generated lecture materials reviewed by subject matter expert',
      'accessibility_check': 'e.g., Materials tested with screen reader and meet WCAG 2.1 AA standards',
      'ip_review': 'e.g., AI-generated content checked against copyright database - no infringement found',
      'teaching_disclosure': 'e.g., Course syllabus includes AI-generated content disclosure statement',
      'material_review_cycle': 'e.g., Quarterly review scheduled - next review April 2026',
      'decision_impact': 'e.g., Impact assessment completed - affects 500 applicants across 3 programs',
      'appeal_process': 'e.g., Written appeal process published - 30-day review window with human committee',
      'admin_bias_audit': 'e.g., Disparate impact analysis completed - no protected group disadvantaged',
      'data_minimization': 'e.g., Reduced data fields from 45 to 12 essential variables for AI processing',
      'admin_disclosure': 'e.g., Notification sent to all applicants that AI assists in initial screening'
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
      'ml_model': 'ML / AI Model Development',
      'literature': 'Literature Review & Synthesis',
      'writing': 'Writing & Editing Assistance',
      'grading': 'Student Grading & Assessment',
      'teaching': 'Teaching Material Development',
      'admin': 'Administrative Decision Making',
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
          Generated by <strong style="color: #64748b;">RAISE</strong> — Responsible AI Standards and Ethics<br/>
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

    const criticalCheckpoints = ['irb', 'data_deidentified', 'participant_consent', 'ferpa_compliance', 'grading_fairness', 'decision_impact'];
    const incompleteCritical = incompleteCheckpoints.filter(c => criticalCheckpoints.includes(c.id));

    if (incompleteCritical.length > 0) {
      risks.push({
        level: 'high',
        message: `${incompleteCritical.length} critical compliance item(s) pending`,
        items: incompleteCritical.map(c => c.label)
      });
    }

    const mediumCheckpoints = ['bias_audit', 'human_review', 'ai_disclosure', 'human_override', 'admin_bias_audit', 'content_accuracy'];
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
          <button className="back-btn" onClick={onBack}>&larr; Back to Activities</button>
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
          <button className="btn-primary" onClick={generateReport}>
            Export Report
          </button>
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
              <span className="stat-label">Overall Activity</span>
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
          Compliance Tracker
        </button>
        <button
          className={`tab ${activeTab === 'ethics-review' ? 'active' : ''}`}
          onClick={() => { setEthicsReviewPhase('assistant'); setActiveTab('ethics-review'); }}
        >
          Ethics Review
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
                          {checkpoint.frameworks && checkpoint.frameworks.length > 0 && (
                            <div className="framework-badges">
                              {checkpoint.frameworks.map(fw => (
                                <span key={fw} className={`framework-badge fw-${fw.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>{fw}</span>
                              ))}
                            </div>
                          )}
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
                      {expandedCheckpoint === checkpoint.id && (
                        <div className="checkpoint-expanded">
                          {checkpoint.what && (
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
                          {/* Inline decisions for this checkpoint */}
                          {(() => {
                            const cpDecisions = (project.decisions || []).filter(d => d.checkpoint === checkpoint.id);
                            if (cpDecisions.length === 0) return null;
                            return (
                              <div className="inline-decisions">
                                <div className="inline-decisions-label">Audit Trail ({cpDecisions.length})</div>
                                {cpDecisions.map(d => (
                                  <div key={d.id} className="inline-decision-item">
                                    <div className="inline-decision-date">{new Date(d.loggedAt).toLocaleDateString()}</div>
                                    <div className="inline-decision-body">
                                      <div className="inline-decision-desc">{d.description}</div>
                                      {d.notes && <div className="inline-decision-notes">{d.notes}</div>}
                                      {d.proofValue && (
                                        <div className="inline-decision-proof">
                                          {d.proofType === 'url'
                                            ? <a href={d.proofValue} target="_blank" rel="noopener noreferrer">{d.proofValue}</a>
                                            : <span>File: {d.proofValue}</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          <CheckpointComments projectId={project.id} checkpointId={checkpoint.id} />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ethics Review Tab */}
      {activeTab === 'ethics-review' && (
        <div className="ethics-review-section">
          <div className="ethics-review-toggle">
            <button
              className={`toggle-btn ${ethicsReviewPhase === 'assistant' ? 'active' : ''}`}
              onClick={() => setEthicsReviewPhase('assistant')}
            >
              Project Review
            </button>
            <button
              className={`toggle-btn ${ethicsReviewPhase === 'quiz' ? 'active' : ''}`}
              onClick={() => setEthicsReviewPhase('quiz')}
            >
              Knowledge Check
            </button>
          </div>
          {ethicsReviewPhase === 'assistant' ? (
            <div className="ethics-tab-section">
              <EthicsAssistant onBack={() => setActiveTab('checkpoints')} />
            </div>
          ) : (
            <div className="assessment-tab-section">
              <Assessment onBack={() => setEthicsReviewPhase('assistant')} />
            </div>
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
