import { useState, useEffect } from 'react';

function ProjectList({ role, onSelectProject, onCreateProject, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', aiUseCase: '' });

  useEffect(() => {
    // Load projects from localStorage (in real app, this would be API)
    const saved = localStorage.getItem('raise_projects');
    if (saved) {
      setProjects(JSON.parse(saved));
    }
  }, []);

  function saveProjects(updatedProjects) {
    localStorage.setItem('raise_projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  }

  function handleCreateProject() {
    if (!newProject.name.trim()) return;

    const project = {
      id: Date.now().toString(),
      name: newProject.name,
      description: newProject.description,
      aiUseCase: newProject.aiUseCase,
      createdAt: new Date().toISOString(),
      status: 'active',
      checkpoints: generateCheckpoints(newProject.aiUseCase),
      decisions: []
    };

    saveProjects([...projects, project]);
    setNewProject({ name: '', description: '', aiUseCase: '' });
    setShowCreateModal(false);
    onSelectProject(project);
  }

  function generateCheckpoints(aiUseCase) {
    // Generate relevant checkpoints based on AI use case
    // Each checkpoint includes educational help text

    const baseCheckpoints = [
      {
        id: 'irb',
        label: 'IRB Status Confirmed',
        category: 'Regulatory',
        completed: false,
        assignedTo: 'pi',
        what: 'Verify whether your research requires IRB approval and if your current protocol covers AI use.',
        why: 'IRB approval obtained before AI tools existed may not cover new AI methods. Using AI on human subjects data without proper approval is a compliance violation.',
        how: 'Check your IRB protocol. If AI is not mentioned, contact your IRB office to determine if an amendment is needed.'
      },
      {
        id: 'data_classification',
        label: 'Data Classification Determined',
        category: 'Data',
        completed: false,
        assignedTo: 'pi',
        what: 'Identify what type of data you are using and its sensitivity level.',
        why: 'Different data types have different handling requirements. Identifiable health data requires stricter controls than public datasets.',
        how: 'Categorize your data: Public, Internal, Confidential, or Restricted. Check if it contains PII, PHI, or other sensitive information.'
      },
      {
        id: 'ai_disclosure',
        label: 'AI Use Disclosure Planned',
        category: 'Transparency',
        completed: false,
        assignedTo: 'pi',
        what: 'Plan how you will disclose AI use in publications, presentations, and to participants.',
        why: 'Most journals and conferences now require AI disclosure. Transparency builds trust and is increasingly required by publishers.',
        how: 'Draft a disclosure statement describing which AI tools were used and for what purpose. Include in your methods section.'
      },
    ];

    const dataCheckpoints = [
      {
        id: 'data_deidentified',
        label: 'Data De-identification Verified',
        category: 'Data',
        completed: false,
        assignedTo: 'student',
        what: 'Ensure personal identifiers are removed before AI processing.',
        why: 'Sending identifiable data to AI systems (especially cloud-based) may violate privacy regulations and IRB requirements.',
        how: 'Remove or mask: names, dates, locations, ID numbers, photos, and any combination that could identify someone. Use established de-identification standards (HIPAA Safe Harbor or Expert Determination).'
      },
      {
        id: 'data_storage',
        label: 'Secure Storage Confirmed',
        category: 'Data',
        completed: false,
        assignedTo: 'student',
        what: 'Verify that data and AI outputs are stored securely.',
        why: 'Research data requires protection from unauthorized access. Cloud AI services may retain data unless configured otherwise.',
        how: 'Use institutional approved storage. Check AI service data retention policies. Enable encryption at rest and in transit.'
      },
    ];

    const modelCheckpoints = [
      {
        id: 'bias_audit',
        label: 'Bias Audit Conducted',
        category: 'Model',
        completed: false,
        assignedTo: 'student',
        what: 'Test your AI model for unfair or biased outcomes across different groups.',
        why: 'AI models can perpetuate or amplify biases in training data, leading to unfair outcomes for certain populations.',
        how: 'Evaluate model performance across demographic subgroups (age, gender, race if applicable). Compare error rates and outcomes. Document any disparities found and mitigation steps taken.'
      },
      {
        id: 'human_review',
        label: 'Human Review Process Defined',
        category: 'Model',
        completed: false,
        assignedTo: 'pi',
        what: 'Establish how humans will review and validate AI outputs.',
        why: 'AI systems make errors. Human oversight catches mistakes and maintains accountability, especially for consequential decisions.',
        how: 'Define: Who reviews AI outputs? What percentage is reviewed? What are the criteria for acceptance/rejection? Document the review process.'
      },
    ];

    const qualitativeCheckpoints = [
      {
        id: 'ai_coding_disclosure',
        label: 'AI-Assisted Coding Disclosed',
        category: 'Transparency',
        completed: false,
        assignedTo: 'student',
        what: 'Document how AI was used in qualitative coding or analysis.',
        why: 'Using AI to code interviews or analyze text changes the methodology. Reviewers and readers need to evaluate this.',
        how: 'Describe the AI tool used, what it did (initial codes, theme suggestions), and how human researchers validated or modified the output.'
      },
      {
        id: 'participant_consent',
        label: 'Participant Consent Covers AI',
        category: 'Regulatory',
        completed: false,
        assignedTo: 'pi',
        what: 'Ensure consent forms mention AI processing of participant data.',
        why: 'Participants have a right to know their data will be processed by AI systems, especially if using cloud-based tools.',
        how: 'Review consent forms. If AI use was not mentioned, consult IRB about whether re-consent or notification is needed.'
      },
    ];

    const writingCheckpoints = [
      {
        id: 'ai_writing_disclosure',
        label: 'AI Writing Assistance Disclosed',
        category: 'Transparency',
        completed: false,
        assignedTo: 'student',
        what: 'Document any AI assistance in drafting or editing text.',
        why: 'Journals require disclosure of AI writing tools. Undisclosed use may be considered a form of misconduct.',
        how: 'List AI tools used (e.g., ChatGPT, Grammarly AI). Describe the extent: grammar checking, sentence rephrasing, content generation. Place in acknowledgments or methods.'
      },
    ];

    let checkpoints = [...baseCheckpoints];

    if (aiUseCase === 'data_analysis') {
      checkpoints = [...checkpoints, ...dataCheckpoints, ...modelCheckpoints];
    } else if (aiUseCase === 'qualitative') {
      checkpoints = [...checkpoints, ...dataCheckpoints, ...qualitativeCheckpoints];
    } else if (aiUseCase === 'ml_model') {
      checkpoints = [...checkpoints, ...dataCheckpoints, ...modelCheckpoints];
    } else if (aiUseCase === 'writing') {
      checkpoints = [...checkpoints, ...writingCheckpoints];
    } else if (aiUseCase === 'literature') {
      checkpoints = [...checkpoints, ...writingCheckpoints];
    }

    return checkpoints;
  }

  function getCompletionPercentage(project) {
    if (!project.checkpoints || project.checkpoints.length === 0) return 0;
    const completed = project.checkpoints.filter(c => c.completed).length;
    return Math.round((completed / project.checkpoints.length) * 100);
  }

  function getStatusColor(percentage) {
    if (percentage === 100) return '#22c55e';
    if (percentage >= 50) return '#f59e0b';
    return '#94a3b8';
  }

  const aiUseCases = [
    { value: 'data_analysis', label: 'Data Analysis (quantitative)' },
    { value: 'qualitative', label: 'Qualitative Analysis (interviews, text)' },
    { value: 'ml_model', label: 'ML Model Development' },
    { value: 'literature', label: 'Literature Review / Synthesis' },
    { value: 'writing', label: 'Writing Assistance' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="project-list">
      <header className="project-list-header">
        <div className="header-left">
          <div className="header-badge">RAISE</div>
          <div>
            <h1>My Projects</h1>
            <p className="role-indicator">
              {role === 'pi' ? 'Principal Investigator' :
               role === 'student' ? 'Student Researcher' :
               'Compliance Officer'}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={onLogout}>
            Switch Role
          </button>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="empty-state">
                    <h2>No Projects Yet</h2>
          <p>Create your first project to start tracking AI ethics compliance</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Project
          </button>
        </div>
      ) : (
        <>
          <div className="projects-grid">
            {projects.map((project) => {
              const completion = getCompletionPercentage(project);
              return (
                <div
                  key={project.id}
                  className="project-card"
                  onClick={() => onSelectProject(project)}
                >
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <span className="project-date">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="project-description">{project.description || 'No description'}</p>

                  <div className="project-progress">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${completion}%`,
                          backgroundColor: getStatusColor(completion)
                        }}
                      />
                    </div>
                    <span className="progress-text">{completion}% complete</span>
                  </div>

                  <div className="project-stats">
                    <span>{project.checkpoints?.filter(c => c.completed).length || 0}/{project.checkpoints?.length || 0} checkpoints</span>
                    <span>{project.decisions?.length || 0} decisions logged</span>
                  </div>
                </div>
              );
            })}

            <div
              className="project-card add-card"
              onClick={() => setShowCreateModal(true)}
            >
              <div className="add-icon">+</div>
              <span>New Project</span>
            </div>
          </div>
        </>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>

            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g., Neonatal Pain Detection Study"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Primary AI Use Case *</label>
              <select
                value={newProject.aiUseCase}
                onChange={(e) => setNewProject({ ...newProject, aiUseCase: e.target.value })}
              >
                <option value="">Select use case...</option>
                {aiUseCases.map((uc) => (
                  <option key={uc.value} value={uc.value}>{uc.label}</option>
                ))}
              </select>
              <p className="form-hint">This determines which compliance checkpoints are relevant</p>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateProject}
                disabled={!newProject.name.trim() || !newProject.aiUseCase}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectList;
