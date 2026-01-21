import { useState, useEffect } from 'react';
import { fetchAssessmentQuestions, submitAssessment } from '../services/api';
import Results from './Results';

function Assessment({ onBack }) {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      const data = await fetchAssessmentQuestions();
      setQuestions(data.questions);
      setCategories(data.categories);
    } catch (err) {
      console.error('Failed to load questions', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(questionId, value) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await submitAssessment(answers);
      setResults(res);
    } catch (err) {
      console.error('Failed to submit', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading">Loading assessment...</div>;

  if (results) {
    return <Results results={results} onBack={onBack} />;
  }

  const question = questions[currentIndex];
  const isAnswered = answers[question?.id] !== undefined;
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="assessment">
      <header className="assessment-header">
        <h1>AI Ethics Readiness Assessment</h1>
        <p>This assessment measures actual knowledge, not just self-perception</p>
      </header>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>
      <p className="progress-text">Question {currentIndex + 1} of {questions.length}</p>

      {question && (
        <div className="question-card">
          <span className="question-type">{question.type.replace('_', ' ')}</span>
          <h2>{question.question}</h2>

          <div className="options">
            {question.options.map((option) => (
              <button
                key={option.value}
                className={`option ${answers[question.id] === option.value ? 'selected' : ''}`}
                onClick={() => handleAnswer(question.id, option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="navigation">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="nav-btn"
        >
          Previous
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={answeredCount < questions.length || submitting}
            className="submit-btn"
          >
            {submitting ? 'Analyzing...' : `Submit (${answeredCount}/${questions.length} answered)`}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className="nav-btn primary"
          >
            Next
          </button>
        )}
      </div>

      <button onClick={onBack} className="back-link">
        Back to Research Summary
      </button>
    </div>
  );
}

export default Assessment;
