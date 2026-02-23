import { useState, useEffect } from 'react';
import { fetchProjects, createProject } from '../services/api';

function ProjectList({ role, onSelectProject, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', aiUseCase: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject() {
    if (!newProject.name.trim() || !newProject.aiUseCase) return;

    setCreating(true);
    try {
      const project = await createProject(
        newProject.name,
        newProject.description,
        newProject.aiUseCase
      );
      setProjects([project, ...projects]);
      setNewProject({ name: '', description: '', aiUseCase: '' });
      setShowCreateModal(false);
      onSelectProject(project);
    } catch (err) {
      console.error('Failed to create project', err);
      alert('Error creating project. Please try again.');
    } finally {
      setCreating(false);
    }
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

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

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
            Sign Out
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
                disabled={!newProject.name.trim() || !newProject.aiUseCase || creating}
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectList;
