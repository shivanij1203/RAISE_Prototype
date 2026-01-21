import { useState, useEffect } from 'react';
import { fetchTemplate, generateDocument } from '../services/api';

function DocumentGenerator({ templateKey, templateName, onBack }) {
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState({});
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplate();
  }, [templateKey]);

  async function loadTemplate() {
    try {
      const data = await fetchTemplate(templateKey);
      setTemplate(data);

      // Extract placeholders from template content
      const placeholders = data.content.match(/\{\{(\w+)\}\}/g) || [];
      const uniqueFields = [...new Set(placeholders.map(p => p.replace(/[{}]/g, '')))];

      const initialFields = {};
      uniqueFields.forEach(field => {
        initialFields[field] = '';
      });
      setFields(initialFields);
    } catch (err) {
      console.error('Failed to load template', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(field, value) {
    setFields(prev => ({ ...prev, [field]: value }));
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateDocument(templateKey, fields);
      setGeneratedDoc(result);
    } catch (err) {
      console.error('Failed to generate', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedDoc.content);
    alert('Copied to clipboard!');
  }

  function handleDownload() {
    const blob = new Blob([generatedDoc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateKey}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatFieldName(field) {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (generatedDoc) {
    return (
      <div className="document-output">
        <header className="doc-header">
          <h1>{generatedDoc.name}</h1>
          <div className="doc-actions">
            <button onClick={handleCopy} className="action-btn">
              Copy to Clipboard
            </button>
            <button onClick={handleDownload} className="action-btn">
              Download .md
            </button>
          </div>
        </header>

        <div className="doc-preview">
          <pre>{generatedDoc.content}</pre>
        </div>

        <div className="doc-footer">
          <button onClick={() => setGeneratedDoc(null)} className="secondary-btn">
            Edit Fields
          </button>
          <button onClick={onBack} className="primary-btn">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-generator">
      <header className="gen-header">
        <button onClick={onBack} className="back-link">← Back</button>
        <h1>{templateName}</h1>
        <p>{template?.description}</p>
      </header>

      <div className="fields-form">
        <h3>Fill in the details:</h3>
        {Object.keys(fields).map(field => (
          <div key={field} className="field-group">
            <label htmlFor={field}>{formatFieldName(field)}</label>
            {field.includes('description') || field.includes('notes') || field.includes('procedures') ? (
              <textarea
                id={field}
                value={fields[field]}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                rows={4}
                placeholder={`Enter ${formatFieldName(field).toLowerCase()}...`}
              />
            ) : (
              <input
                type="text"
                id={field}
                value={fields[field]}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                placeholder={`Enter ${formatFieldName(field).toLowerCase()}...`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="gen-actions">
        <button onClick={onBack} className="secondary-btn">
          Cancel
        </button>
        <button onClick={handleGenerate} className="primary-btn">
          Generate Document
        </button>
      </div>
    </div>
  );
}

export default DocumentGenerator;
