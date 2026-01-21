function Results({ results, onBack }) {
  const getColorClass = (color) => {
    switch (color) {
      case 'green': return 'result-good';
      case 'yellow': return 'result-moderate';
      case 'red': return 'result-needs-work';
      default: return '';
    }
  };

  return (
    <div className="results">
      <header className="results-header">
        <h1>Your Assessment Results</h1>
      </header>

      <div className={`readiness-banner ${getColorClass(results.readiness_color)}`}>
        <div className="readiness-score">{results.overall_percentage}%</div>
        <div className="readiness-label">{results.readiness_level}</div>
      </div>

      <div className="scores-grid">
        <div className="score-card">
          <h3>Knowledge Check</h3>
          <div className="score">{results.knowledge_score}/{results.knowledge_total}</div>
          <p>Correct answers on factual questions</p>
        </div>
        <div className="score-card">
          <h3>Scenario Judgment</h3>
          <div className="score">{results.scenario_score}/{results.scenario_total}</div>
          <p>Appropriate responses to ethical scenarios</p>
        </div>
        <div className="score-card">
          <h3>Self-Assessment</h3>
          <div className="score">{results.self_perception}/5</div>
          <p>How you rated your own knowledge</p>
        </div>
      </div>

      {results.perception_gap && (
        <div className="perception-gap">
          <h3>Perception vs. Reality</h3>
          <p>{results.perception_gap}</p>
        </div>
      )}

      {results.gaps.length > 0 && (
        <div className="gaps-section">
          <h3>Areas for Improvement</h3>
          <p className="section-subtitle">These topics need attention based on your responses:</p>
          {results.gaps.map((gap, idx) => (
            <div key={idx} className="gap-item">
              <span className="gap-category">{gap.category}</span>
              <p className="gap-question">{gap.question}</p>
              {gap.explanation && (
                <p className="gap-explanation">{gap.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="benchmark-comparison">
        <h3>How You Compare</h3>
        <div className="benchmark-item">
          <span>National average: 68% lack formal AI training</span>
          <span className="benchmark-source">Source: EDUCAUSE 2024</span>
        </div>
        <div className="benchmark-item">
          <span>77% of institutions report not being ready for GenAI</span>
          <span className="benchmark-source">Source: EDUCAUSE 2024</span>
        </div>
        {results.overall_percentage >= 70 && (
          <p className="benchmark-note">
            Your score suggests you're better prepared than most faculty nationally.
          </p>
        )}
      </div>

      <div className="next-steps">
        <h3>Recommended Next Steps</h3>
        <ul>
          {results.gaps.some(g => g.category === 'privacy') && (
            <li>Review FERPA guidelines for AI tool usage with student data</li>
          )}
          {results.gaps.some(g => g.category === 'accuracy') && (
            <li>Learn about AI hallucinations and citation verification</li>
          )}
          {results.gaps.some(g => g.category === 'bias') && (
            <li>Explore resources on identifying and mitigating AI bias</li>
          )}
          {results.gaps.some(g => g.category === 'transparency') && (
            <li>Develop clear AI use policies for your courses</li>
          )}
          {results.gaps.length === 0 && (
            <li>Consider mentoring colleagues on AI ethics best practices</li>
          )}
        </ul>
      </div>

      <button onClick={onBack} className="back-btn">
        Return to Dashboard
      </button>
    </div>
  );
}

export default Results;
