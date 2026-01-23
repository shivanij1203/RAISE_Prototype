import { useState } from 'react';

function RoleSelector({ onRoleSelect }) {
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    {
      id: 'student',
      title: 'Student / New Researcher',
      description: 'Learning about AI ethics in research. Get educational guidance and checklists.',
      features: ['Educational explanations', 'Step-by-step guidance', 'Learning resources']
    },
    {
      id: 'pi',
      title: 'Principal Investigator / Faculty',
      description: 'Managing research projects with AI components. Track compliance and generate reports.',
      features: ['Project tracking', 'Decision logging', 'Compliance reports', 'Team oversight']
    },
    {
      id: 'compliance',
      title: 'Compliance Officer / Admin',
      description: 'Overseeing institutional AI research compliance. View aggregate data and audit trails.',
      features: ['Multi-project overview', 'Audit trails', 'Institutional reports']
    }
  ];

  function handleContinue() {
    if (selectedRole) {
      localStorage.setItem('raise_user_role', selectedRole);
      onRoleSelect(selectedRole);
    }
  }

  return (
    <div className="role-selector">
      <header className="role-header">
        <h1>Welcome to RAISE</h1>
        <p className="subtitle">AI Research Compliance Tracker</p>
        <p className="role-prompt">Select your role to get started</p>
      </header>

      <div className="role-cards">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`role-card ${selectedRole === role.id ? 'selected' : ''}`}
            onClick={() => setSelectedRole(role.id)}
          >
                        <h3>{role.title}</h3>
            <p className="role-description">{role.description}</p>
            <ul className="role-features">
              {role.features.map((feature, idx) => (
                <li key={idx}>{feature}</li>
              ))}
            </ul>
            {selectedRole === role.id && (
              <div className="selected-indicator">✓ Selected</div>
            )}
          </div>
        ))}
      </div>

      <button
        className="continue-btn"
        onClick={handleContinue}
        disabled={!selectedRole}
      >
        Continue as {selectedRole ? roles.find(r => r.id === selectedRole)?.title : '...'} →
      </button>

    </div>
  );
}

export default RoleSelector;
