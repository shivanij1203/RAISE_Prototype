import { useState } from 'react';
import DocumentGenerator from './DocumentGenerator';

function EthicsResult({ result, onBack, onStartOver, onExit }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const riskColors = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#16a34a'
  };

  const severityLabels = {
    critical: 'Critical',
    important: 'Important',
    recommended: 'Tip'
  };

  if (selectedTemplate) {
    return (
      <DocumentGenerator
        templateKey={selectedTemplate.key}
        templateName={selectedTemplate.name}
        onBack={() => setSelectedTemplate(null)}
      />
    );
  }

  return (
    <div className="ethics-result">
      <header className="result-header">
        <h1>Your Guidance</h1>
      </header>

      <div
        className="risk-banner"
        style={{ backgroundColor: riskColors[result.risk_level] }}
      >
        <div className="risk-level">{result.risk_level.toUpperCase()} RISK</div>
        <h2>{result.title}</h2>
        <p>{result.summary}</p>
      </div>

      {/* Safe Path Forward - The main actionable section */}
      {result.safe_path && (
        <section className="safe-path-section">
          <h3>{result.safe_path.title}</h3>
          <p className="path-description">{result.safe_path.description}</p>

          <div className="steps-container">
            {result.safe_path.steps.map((step) => (
              <div key={step.step} className="step-card">
                <div className="step-number">{step.step}</div>
                <div className="step-content">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                  {step.time_estimate && (
                    <span className="time-estimate">{step.time_estimate}</span>
                  )}
                  {step.template && (
                    <button
                      className="step-template-btn"
                      onClick={() => setSelectedTemplate({
                        key: step.template,
                        name: step.title
                      })}
                    >
                      Generate {step.title} Document →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Additional Considerations */}
      {result.considerations?.length > 0 && (
        <section className="considerations-section">
          <h3>Additional Notes</h3>
          {result.considerations.map((item, idx) => (
            <div key={idx} className={`consideration-card severity-${item.severity}`}>
              <div className="consideration-header">
                <span className="severity-label">{severityLabels[item.severity]}</span>
                <h4>{item.title}</h4>
              </div>
              <p>{item.guidance}</p>
            </div>
          ))}
        </section>
      )}

      {/* Templates Section - for results without safe_path */}
      {!result.safe_path && result.available_templates?.length > 0 && (
        <section className="templates-section">
          <h3>Generate Documentation</h3>
          <p className="section-desc">
            Select a template to generate customized documentation:
          </p>
          <div className="template-grid">
            {result.available_templates.map((template) => (
              <button
                key={template.key}
                className="template-card"
                onClick={() => setSelectedTemplate(template)}
              >
                <h4>{template.name}</h4>
                <p>{template.description}</p>
                <span className="generate-link">Generate →</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="result-actions">
        <button className="secondary-btn" onClick={onBack}>
          ← Modify Answers
        </button>
        <button className="secondary-btn" onClick={onStartOver}>
          Start Over
        </button>
        <button className="primary-btn" onClick={onExit}>
          Done
        </button>
      </div>
    </div>
  );
}

export default EthicsResult;
