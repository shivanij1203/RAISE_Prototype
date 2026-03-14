import { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Login from './components/Login';
import ProjectList from './components/ProjectList';
import ProjectDashboard from './components/ProjectDashboard';
import './App.css';

// Map auth roles to dashboard roles
function mapRole(authRole) {
  const roleMap = { faculty: 'pi', student: 'student' };
  return roleMap[authRole] || authRole;
}

function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('align_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setUserRole(mapRole(user.role));
      setCurrentView('projects');
    } else {
      setCurrentView('landing');
    }
  }, []);

  function handleLogin(user) {
    localStorage.setItem('align_user', JSON.stringify(user));
    setCurrentUser(user);
    setUserRole(mapRole(user.role));
    setCurrentView('projects');
  }

  function handleLogout() {
    localStorage.removeItem('align_user');
    setCurrentView('landing');
    setCurrentUser(null);
    setUserRole(null);
    setCurrentView('login');
  }

  function handleSelectProject(project) {
    setSelectedProject(project);
    setCurrentView('project-detail');
  }

  function handleBackToProjects() {
    setSelectedProject(null);
    setCurrentView('projects');
  }

  if (currentView === 'loading') {
    return <div className="loading">Loading...</div>;
  }

  if (currentView === 'landing') {
    return <Landing onGetStarted={() => setCurrentView('login')} />;
  }

  if (currentView === 'login') {
    return <Login onLogin={handleLogin} onBack={() => setCurrentView('landing')} />;
  }

  if (currentView === 'project-detail' && selectedProject) {
    return (
      <ProjectDashboard
        project={selectedProject}
        role={userRole}
        onBack={handleBackToProjects}
        onProjectUpdated={(updated) => setSelectedProject(updated)}
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
