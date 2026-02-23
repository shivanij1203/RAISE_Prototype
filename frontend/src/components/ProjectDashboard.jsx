import { useState } from 'react';
import { toggleCheckpoint, logDecision, fetchProject } from '../services/api';

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
    const report = {
      projectName: project.name,
      generatedAt: new Date().toISOString(),
      checkpoints: project.checkpoints,
      decisions: project.decisions || [],
      completionRate: getCompletionPercentage()
    };

    const reportText = formatReportAsText(report);
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_Ethics_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatReportAsText(report) {
    const completedCount = report.checkpoints.filter(c => c.completed).length;
    const totalCount = report.checkpoints.length;
    const pendingCount = totalCount - completedCount;
    const risk = getRiskAssessment();

    const useCaseLabels = {
      'data_analysis': 'Quantitative Data Analysis',
      'qualitative': 'Qualitative Analysis',
      'ml_model': 'ML Model Development',
      'literature': 'Literature Review / Synthesis',
      'writing': 'Writing Assistance',
      'other': 'Other'
    };

    let text = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                       AI ETHICS COMPLIANCE REPORT                              ║
║                                  RAISE                                         ║
║              Research Accountability and Integrity for Sustainable Ethics      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Report Generated: ${new Date(report.generatedAt).toLocaleString()}

┌───────────────────────────────────────────────────────────────────────────────┐
│  PROJECT INFORMATION                                                           │
└───────────────────────────────────────────────────────────────────────────────┘

  Project Name:      ${report.projectName}
  AI Use Case:       ${useCaseLabels[project.aiUseCase] || 'Not specified'}
  Description:       ${project.description || 'No description provided'}
  Created:           ${new Date(project.createdAt).toLocaleDateString()}

┌───────────────────────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                                                             │
└───────────────────────────────────────────────────────────────────────────────┘

  COMPLIANCE STATUS: ${report.completionRate}%
  `;

    const progressBarLength = 40;
    const filledLength = Math.round((report.completionRate / 100) * progressBarLength);
    const progressBar = '\u2588'.repeat(filledLength) + '\u2591'.repeat(progressBarLength - filledLength);
    text += `
  Progress: [${progressBar}] ${report.completionRate}%

  Checkpoints:       ${completedCount} completed / ${totalCount} total
  Decisions Logged:  ${report.decisions.length}

  RISK LEVEL:        ${risk.overallRisk.toUpperCase()}
`;

    if (risk.risks.length > 0) {
      text += `\n  Risk Factors:\n`;
      risk.risks.forEach(r => {
        text += `    \u2022 [${r.level.toUpperCase()}] ${r.message}\n`;
      });
    } else {
      text += `\n  \u2713 No outstanding compliance risks identified\n`;
    }

    if (report.completionRate === 100) {
      text += `
  \u2501\u2501\u2501 ALL COMPLIANCE CHECKPOINTS COMPLETE \u2501\u2501\u2501
`;
    } else if (pendingCount > 0) {
      text += `
  WARNING: ${pendingCount} CHECKPOINT(S) PENDING - ACTION REQUIRED
`;
    }

    text += `
┌───────────────────────────────────────────────────────────────────────────────┐
│  CHECKPOINT STATUS DETAIL                                                      │
└───────────────────────────────────────────────────────────────────────────────┘
  Legend: \u2713 = Completed | \u25CB = Pending
`;

    const categories = [...new Set(report.checkpoints.map(c => c.category))];
    categories.forEach(category => {
      const catCheckpoints = report.checkpoints.filter(c => c.category === category);
      const catCompleted = catCheckpoints.filter(c => c.completed).length;
      const catPercent = Math.round((catCompleted / catCheckpoints.length) * 100);

      text += `
  --- ${category.toUpperCase()} (${catCompleted}/${catCheckpoints.length} - ${catPercent}%) ---
`;
      catCheckpoints.forEach(cp => {
        const statusIcon = cp.completed ? '  \u2713' : '  \u25CB';
        const statusLabel = cp.completed ? '[DONE]   ' : '[PENDING]';
        const date = cp.completedAt
          ? `Completed: ${new Date(cp.completedAt).toLocaleDateString()}`
          : 'Not yet completed';
        text += `${statusIcon} ${statusLabel} ${cp.label}\n`;
        text += `                 ${date}\n`;
      });
    });

    text += `
┌───────────────────────────────────────────────────────────────────────────────┐
│  DECISION AUDIT LOG                                                            │
└───────────────────────────────────────────────────────────────────────────────┘
`;

    if (report.decisions.length === 0) {
      text += `
  No decisions have been logged for this project yet.

  Tip: Log decisions to create an audit trail for compliance documentation.
`;
    } else {
      text += `
  Total Decisions Recorded: ${report.decisions.length}
`;
      report.decisions.forEach((decision, index) => {
        const checkpointLabel = project.checkpoints.find(c => c.id === decision.checkpoint)?.label || 'General';
        let evidenceText = '';
        if (decision.proofType && decision.proofValue) {
          evidenceText = decision.proofType === 'url'
            ? `\n  Evidence:    ${decision.proofValue}`
            : `\n  File Ref:    ${decision.proofValue}`;
        }
        text += `
  ─────────────────────────────────────────────────────────────────────────────
  DECISION #${index + 1}
  Date:        ${new Date(decision.loggedAt).toLocaleDateString()} at ${new Date(decision.loggedAt).toLocaleTimeString()}
  Checkpoint:  ${checkpointLabel}
  Decision:    ${decision.description}${decision.notes ? `\n  Notes:       ${decision.notes}` : ''}${evidenceText}
`;
      });
    }

    const incompleteCheckpoints = report.checkpoints.filter(c => !c.completed);
    if (incompleteCheckpoints.length > 0) {
      text += `
┌───────────────────────────────────────────────────────────────────────────────┐
│  REQUIRED ACTION ITEMS                                                         │
└───────────────────────────────────────────────────────────────────────────────┘

  The following items require attention before this project is fully compliant:

`;
      incompleteCheckpoints.forEach((cp, index) => {
        text += `  ${index + 1}. ${cp.label}\n`;
        if (cp.how) {
          text += `     How to complete: ${cp.how}\n`;
        }
        text += '\n';
      });
    }

    text += `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              END OF REPORT                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Generated by RAISE - AI Research Compliance Tracker                           ║
║  This report documents AI ethics compliance status for research oversight.     ║
║  For questions about compliance requirements, contact your IRB office.         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

    return text;
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
Generated using RAISE (Research Accountability and Integrity for Sustainable Ethics)
Date: ${new Date().toLocaleDateString()}`;

    setGeneratedDisclosure(statement);
  }

  function copyDisclosure() {
    navigator.clipboard.writeText(generatedDisclosure);
    alert('Disclosure statement copied to clipboard!');
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
          <button className="btn-primary" onClick={generateReport}>
            {role === 'compliance' ? 'Generate Audit Report' :
             role === 'student' ? 'Generate Draft Report' :
             'Generate Report'}
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
            <span className="progress-label">Complete</span>
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
              <span className="stat-value">{allCheckpoints.filter(c => c.completed).length}/{allCheckpoints.length}</span>
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
