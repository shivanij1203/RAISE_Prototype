import { useState } from 'react';
import Assessment from './Assessment';
import EthicsAssistant from './EthicsAssistant';

function Dashboard() {
  const [currentView, setCurrentView] = useState('dashboard');

  if (currentView === 'assessment') {
    return <Assessment onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'ethics') {
    return <EthicsAssistant onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="dashboard">
      <header className="main-header">
        <div className="header-badge">RAISE Digital Toolkit</div>
        <h1>AI Ethics Guidance for Researchers</h1>
        <p className="subtitle">
          Practical tools to help faculty use AI responsibly in research and teaching
        </p>
      </header>

      <div className="tools-section">
        <div className="tool-card primary-tool" onClick={() => setCurrentView('ethics')}>
          <h3>Ethics Decision Assistant</h3>
          <p>
            Answer a few questions about your AI use case and get personalized,
            step-by-step guidance on how to proceed ethically and compliantly.
          </p>
          <div className="tool-outputs">
            <span>Generates:</span>
            <ul>
              <li>IRB amendment templates</li>
              <li>Disclosure statements</li>
              <li>Compliance checklists</li>
            </ul>
          </div>
          <button className="tool-btn">Get Guidance →</button>
        </div>

        <div className="tool-card" onClick={() => setCurrentView('assessment')}>
          <h3>Ethics Knowledge Assessment</h3>
          <p>
            Test your understanding of AI ethics through scenario-based questions.
            Identify gaps in your knowledge before they become compliance issues.
          </p>
          <div className="tool-outputs">
            <span>You'll receive:</span>
            <ul>
              <li>Knowledge score</li>
              <li>Gap analysis</li>
              <li>Training recommendations</li>
            </ul>
          </div>
          <button className="tool-btn secondary">Take Assessment →</button>
        </div>
      </div>

      <section className="use-cases-section">
        <h2>Common AI Use Cases We Cover</h2>
        <div className="use-cases-grid">
          <div className="use-case">
            <h4>Qualitative Analysis</h4>
            <p>Analyzing interviews, transcripts, or focus group data</p>
          </div>
          <div className="use-case">
            <h4>Quantitative Analysis</h4>
            <p>Statistical analysis, data processing, or code generation</p>
          </div>
          <div className="use-case">
            <h4>Literature Review</h4>
            <p>Searching, summarizing, or synthesizing research papers</p>
          </div>
          <div className="use-case">
            <h4>Writing Assistance</h4>
            <p>Drafting, editing, or improving manuscripts</p>
          </div>
          <div className="use-case">
            <h4>Grant Writing</h4>
            <p>Preparing or refining grant proposals</p>
          </div>
          <div className="use-case">
            <h4>Teaching & Grading</h4>
            <p>Creating materials or providing student feedback</p>
          </div>
        </div>
      </section>

      <section className="why-section">
        <h2>Why This Matters</h2>
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-number">61%</span>
            <span className="stat-label">of faculty use AI in teaching</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">68%</span>
            <span className="stat-label">have no formal AI training</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">61%</span>
            <span className="stat-label">of institutions lack AI policies</span>
          </div>
        </div>
        <p className="stats-source">
          Sources: EDUCAUSE 2024, Digital Education Council 2025
        </p>
      </section>

      <footer>
        <div className="footer-content">
          <div className="footer-about">
            <h4>About RAISE</h4>
            <p>
              Research Accountability and Integrity for Sustainable Ethics in AI.
              RAISE examines how AI is reshaping academic research and develops
              practical tools for responsible AI use.
            </p>
          </div>
          <div className="footer-links">
            <h4>Learn More</h4>
            <ul>
              <li><a href="https://www.usf.edu" target="_blank" rel="noopener noreferrer">USF College of Behavioral Sciences</a></li>
              <li><a href="https://www.educause.edu/ecar" target="_blank" rel="noopener noreferrer">EDUCAUSE AI Research</a></li>
              <li><a href="https://publicationethics.org" target="_blank" rel="noopener noreferrer">COPE Guidelines</a></li>
            </ul>
          </div>
        </div>
        <p className="footer-note">
          Prototype demonstration for the RAISE project
        </p>
      </footer>
    </div>
  );
}

export default Dashboard;
