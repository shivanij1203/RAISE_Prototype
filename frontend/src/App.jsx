import { useState, useEffect } from 'react';
import RoleSelector from './components/RoleSelector';
import ProjectList from './components/ProjectList';
import ProjectDashboard from './components/ProjectDashboard';
import './App.css';

function App() {
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState('loading');
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    // Check if user has already selected a role
    const savedRole = localStorage.getItem('raise_user_role');
    if (savedRole) {
      setUserRole(savedRole);
      setCurrentView('projects');
    } else {
      setCurrentView('role');
    }
  }, []);

  function handleRoleSelect(role) {
    setUserRole(role);
    setCurrentView('projects');
  }

  function handleLogout() {
    localStorage.removeItem('raise_user_role');
    setUserRole(null);
    setCurrentView('role');
  }

  function handleSelectProject(project) {
    setSelectedProject(project);
    setCurrentView('project-detail');
  }

  function handleUpdateProject(updatedProject) {
    // Update in localStorage
    const saved = localStorage.getItem('raise_projects');
    if (saved) {
      const projects = JSON.parse(saved);
      const updatedProjects = projects.map(p =>
        p.id === updatedProject.id ? updatedProject : p
      );
      localStorage.setItem('raise_projects', JSON.stringify(updatedProjects));
    }
    setSelectedProject(updatedProject);
  }

  function handleBackToProjects() {
    setSelectedProject(null);
    setCurrentView('projects');
  }

  if (currentView === 'loading') {
    return <div className="loading">Loading...</div>;
  }

  if (currentView === 'role') {
    return <RoleSelector onRoleSelect={handleRoleSelect} />;
  }

  if (currentView === 'project-detail' && selectedProject) {
    return (
      <ProjectDashboard
        project={selectedProject}
        role={userRole}
        onBack={handleBackToProjects}
        onUpdateProject={handleUpdateProject}
      />
    );
  }

  return (
    <ProjectList
      role={userRole}
      onSelectProject={handleSelectProject}
      onLogout={handleLogout}
    />
  );
}

export default App;
