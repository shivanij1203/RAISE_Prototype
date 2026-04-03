import { useState, useEffect } from 'react';
import { fetchEthicsStart, fetchEthicsNode, evaluateEthicsPath, startSession, recordResponse, completeSession } from '../services/api';
import EthicsResult from './EthicsResult';

function EthicsAssistant({ onBack }) {
  const [currentNode, setCurrentNode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionCode, setSessionCode] = useState(null);

  useEffect(() => {
    loadStartNode();
    // Start a research session to track responses
    const participantCode = localStorage.getItem('raise_participant_code');
    startSession(participantCode, '').then(data => {
      setSessionCode(data.session_code);
    }).catch(() => {});
  }, []);

  async function loadStartNode() {
    try {
      const node = await fetchEthicsStart();
      setCurrentNode(node);
    } catch (err) {
      console.error('Failed to load', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(value, nextNodeKey) {
    const newAnswers = { ...answers, [currentNode.key]: value };
    setAnswers(newAnswers);
    setHistory([...history, { node: currentNode, answer: value }]);

    // Save this response to the database
    if (sessionCode) {
      const label = currentNode.options.find(o => o.value === value)?.label || '';
      recordResponse(sessionCode, currentNode.key, String(value), label, history.length + 1)
        .catch(() => {});
    }

    if (nextNodeKey.startsWith('terminal_')) {
      // Evaluate and show results
      setLoading(true);
      try {
        const res = await evaluateEthicsPath(newAnswers);
        setResult(res);
        // Mark session complete
        if (sessionCode) {
          completeSession(sessionCode, nextNodeKey, res.risk_level || '').catch(() => {});
        }
      } catch (err) {
        console.error('Failed to evaluate', err);
      } finally {
        setLoading(false);
      }
    } else {
      // Load next node
      setLoading(true);
      try {
        const node = await fetchEthicsNode(nextNodeKey);
        setCurrentNode(node);
      } catch (err) {
        console.error('Failed to load node', err);
      } finally {
        setLoading(false);
      }
    }
  }

  function handleBack() {
    if (history.length === 0) {
      onBack();
      return;
    }

    const newHistory = [...history];
    const previous = newHistory.pop();

    const newAnswers = { ...answers };
    delete newAnswers[previous.node.key];

    setHistory(newHistory);
    setAnswers(newAnswers);
    setCurrentNode(previous.node);
    setResult(null);
  }

  function handleStartOver() {
    setAnswers({});
    setHistory([]);
    setResult(null);
    loadStartNode();
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (result) {
    return (
      <EthicsResult
        result={result}
        onBack={handleBack}
        onStartOver={handleStartOver}
        onExit={onBack}
      />
    );
  }

  return (
    <div className="ethics-assistant">
      <header className="ethics-header">
        <h1>AI Research Ethics Assistant</h1>
        <p>Get personalized guidance and documentation for your specific situation</p>
      </header>

      <div className="progress-indicator">
        <span className="step-count">Question {history.length + 1}</span>
        {history.length > 0 && (
          <button className="back-step" onClick={handleBack}>
            ← Back to previous question
          </button>
        )}
      </div>

      {currentNode && (
        <div className="question-panel">
          <h2>{currentNode.question}</h2>
          {currentNode.help_text && (
            <p className="help-text">{currentNode.help_text}</p>
          )}

          <div className="options-list">
            {currentNode.options.map((option) => (
              <button
                key={String(option.value)}
                className="option-button"
                onClick={() => handleAnswer(option.value, option.next)}
              >
                <span className="option-label">{option.label}</span>
                <span className="option-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="history-summary">
          <h4>Your selections:</h4>
          <ul>
            {history.map((item, idx) => (
              <li key={idx}>
                <span className="history-q">{item.node.question}</span>
                <span className="history-a">
                  {item.node.options.find(o => o.value === item.answer)?.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="exit-button" onClick={onBack}>
        Exit to Dashboard
      </button>
    </div>
  );
}

export default EthicsAssistant;
