import { useState, useEffect } from 'react';
import Login from './components/Login';
import ConsentForm from './components/ConsentForm';
import ProjectList from './components/ProjectList';
import ProjectDashboard from './components/ProjectDashboard';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('raise_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setUserRole(user.role);

      // Check if they've done consent
      const consent = localStorage.getItem('raise_consent_status');
      if (!consent) {
        setCurrentView('consent');
      } else {
        setCurrentView('projects');
      }
    } else {
      setCurrentView('login');
    }
  }, []);

  function handleLogin(user) {
    localStorage.setItem('raise_user', JSON.stringify(user));
    setCurrentUser(user);
    setUserRole(user.role);

    const consent = localStorage.getItem('raise_consent_status');
    if (!consent) {
      setCurrentView('consent');
    } else {
      setCurrentView('projects');
    }
  }

  function handleConsent(participantCode) {
    localStorage.setItem('raise_consent_status', 'consented');
    setCurrentView('projects');
  }

  function handleSkipConsent() {
    localStorage.setItem('raise_consent_status', 'skipped');
    setCurrentView('projects');
  }

  function handleLogout() {
    localStorage.removeItem('raise_user');
    localStorage.removeItem('raise_consent_status');
    localStorage.removeItem('raise_participant_code');
    setCurrentUser(null);
    setUserRole(null);
    setCurrentView('login');
  }

  function handleSelectProject(project) {
    setSelectedProject(project);
    setCurrentView('project-detail');
  }

  function handleUpdateProject(updatedProject) {
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

  if (currentView === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  if (currentView === 'consent') {
    return <ConsentForm onConsent={handleConsent} onSkip={handleSkipConsent} />;
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
