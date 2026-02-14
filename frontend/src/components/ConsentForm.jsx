import { useState } from 'react';
import { submitConsent } from '../services/api';

function ConsentForm({ onConsent, onSkip }) {
  const [consentData, setConsentData] = useState(false);
  const [consentLongitudinal, setConsentLongitudinal] = useState(false);
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!consentData) {
      alert('Please consent to data collection to participate.');
      return;
    }

    setLoading(true);
    try {
      const data = await submitConsent({
        consent_to_data_collection: consentData,
        consent_to_longitudinal: consentLongitudinal,
        role,
        department_category: department,
      });
      localStorage.setItem('raise_participant_code', data.participant_code);
      onConsent(data.participant_code);
    } catch (err) {
      console.error('Consent error:', err);
      alert('Error submitting consent. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="consent-container">
      <div className="consent-card">
        <h1>Research Participation</h1>
        <p>This tool is part of a research study on how faculty navigate AI ethics decisions.</p>

        <div className="consent-info">
          <h3>What we collect</h3>
          <ul>
            <li>Your responses to ethics questions</li>
            <li>Which path you take through the decision tree</li>
            <li>Which documents you generate</li>
          </ul>

          <h3>What we don't collect</h3>
          <ul>
            <li>Your name or email</li>
            <li>Content of documents you generate</li>
            <li>Anything that could identify you</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Role (optional)</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="">Select...</option>
              <option value="faculty">Faculty</option>
              <option value="graduate_student">Graduate Student</option>
              <option value="postdoc">Postdoc</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div className="form-group">
            <label>Department (optional)</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">Select...</option>
              <option value="stem">STEM</option>
              <option value="social_sciences">Social Sciences</option>
              <option value="humanities">Humanities</option>
              <option value="business">Business</option>
              <option value="health_sciences">Health Sciences</option>
            </select>
          </div>

          <div className="consent-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={consentData}
                onChange={e => setConsentData(e.target.checked)}
              />
              I consent to data collection for research purposes *
            </label>

            <label>
              <input
                type="checkbox"
                checked={consentLongitudinal}
                onChange={e => setConsentLongitudinal(e.target.checked)}
              />
              I consent to my sessions being linked over time (optional)
            </label>
          </div>

          <div className="consent-actions">
            <button type="button" className="btn-secondary" onClick={onSkip}>
              Skip — Use Without Participating
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'I Consent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ConsentForm;
