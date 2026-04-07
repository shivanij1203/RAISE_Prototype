import { useState, useEffect } from 'react';
import { fetchTools, createTool, updateTool } from '../services/api';

const CATEGORIES = [
  { value: 'chatbot', label: 'Chatbot' },
  { value: 'code_assistant', label: 'Code Assistant' },
  { value: 'grading', label: 'Grading' },
  { value: 'writing', label: 'Writing' },
  { value: 'image_gen', label: 'Image Generation' },
  { value: 'data_analysis', label: 'Data Analysis' },
  { value: 'research', label: 'Research' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'not_recommended', label: 'Not Recommended' },
];

function AIToolRegistry({ role, onBack }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', vendor: '', category: '', status: 'under_review', risk_notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isFaculty = role === 'pi';

  useEffect(() => { loadTools(); }, []);

  async function loadTools() {
    try {
      const data = await fetchTools();
      setTools(data);
    } catch (err) {
      console.error('Failed to load tools', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.category) return;
    setSaving(true);
    setError('');
    try {
      if (editingTool) {
        const updated = await updateTool(editingTool.id, formData);
        setTools(tools.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await createTool(formData);
        setTools([created, ...tools]);
      }
      setShowAddModal(false);
      setEditingTool(null);
      setFormData({ name: '', description: '', vendor: '', category: '', status: 'under_review', risk_notes: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save tool.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(tool) {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description,
      vendor: tool.vendor,
      category: tool.category,
      status: tool.status,
      risk_notes: tool.riskNotes || '',
    });
    setShowAddModal(true);
  }

  const filtered = tools.filter(t => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  const statusColor = (s) => s === 'approved' ? 'status-approved' : s === 'not_recommended' ? 'status-not-rec' : 'status-review';

  if (loading) {
    return (
      <div className="tool-registry">
        <div className="pl-topbar">
          <div className="pl-topbar-inner">
            <div className="pl-topbar-brand">
              <img src="/usf-logo.svg" alt="USF" className="pl-topbar-logo" />
              <div className="pl-topbar-text">
                <span className="pl-topbar-uni">University of South Florida</span>
                <span className="pl-topbar-app">RAISE Ethics Toolkit</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pl-nav">
          <div className="pl-nav-inner">
            <button className="pl-nav-tab" onClick={onBack}>My Activities</button>
            <button className="pl-nav-tab active">AI Tool Registry</button>
          </div>
        </div>
        <div className="tool-registry-content">
          <div className="tool-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="tool-card skeleton-card">
                <div className="skeleton-line skeleton-title"></div>
                <div className="skeleton-line skeleton-text"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-registry">
      {/* USF-style top bar */}
      <div className="pl-topbar">
        <div className="pl-topbar-inner">
          <div className="pl-topbar-brand">
            <img src="/usf-logo.svg" alt="USF" className="pl-topbar-logo" />
            <div className="pl-topbar-text">
              <span className="pl-topbar-uni">University of South Florida</span>
              <span className="pl-topbar-app">RAISE Ethics Toolkit</span>
            </div>
          </div>
          <div className="pl-topbar-right">
            {isFaculty && (
              <button className="pl-signout" onClick={() => { setEditingTool(null); setFormData({ name: '', description: '', vendor: '', category: '', status: 'under_review', risk_notes: '' }); setShowAddModal(true); }}>
                + Add Tool
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="pl-nav">
        <div className="pl-nav-inner">
          <button className="pl-nav-tab" onClick={onBack}>My Activities</button>
          <button className="pl-nav-tab active">AI Tool Registry</button>
          <button className="pl-nav-tab" onClick={onBack}>Dashboard</button>
        </div>
      </div>

      {/* Content */}
      <div className="tool-registry-content">
        <div className="tool-registry-title-row">
          <div>
            <h2 className="tool-registry-heading">AI Tool Registry</h2>
            <p className="tool-subtitle">{tools.length} tool{tools.length !== 1 ? 's' : ''} registered across the institution</p>
          </div>
        </div>

        {/* Filters */}
        <div className="tool-filters">
        <input
          type="text"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="tool-search"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Tool Grid */}
      {filtered.length === 0 ? (
        <div className="tool-empty">
          {tools.length === 0
            ? 'No tools registered yet. Faculty can add AI tools used at the institution.'
            : 'No tools match your filters.'}
        </div>
      ) : (
        <div className="tool-grid">
          {filtered.map(tool => (
            <div key={tool.id} className="tool-card">
              <div className="tool-card-top">
                <span className="tool-category-badge">{tool.categoryDisplay}</span>
                <span className={`tool-status-pill ${statusColor(tool.status)}`}>{tool.statusDisplay}</span>
              </div>
              <h3 className="tool-name">{tool.name}</h3>
              {tool.vendor && <div className="tool-vendor">by {tool.vendor}</div>}
              {tool.description && <p className="tool-description">{tool.description}</p>}
              {tool.riskNotes && (
                <div className="tool-risk-note">
                  <strong>Risk Notes:</strong> {tool.riskNotes}
                </div>
              )}
              <div className="tool-card-footer">
                <span className="tool-usage">{tool.projectCount} activit{tool.projectCount === 1 ? 'y' : 'ies'} using this</span>
                {isFaculty && (
                  <button className="btn-secondary btn-small" onClick={() => openEdit(tool)}>Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTool ? 'Edit Tool' : 'Register New Tool'}</h2>

            <div className="form-group">
              <label>Tool Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., ChatGPT" />
            </div>
            <div className="form-group">
              <label>Vendor</label>
              <input type="text" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder="e.g., OpenAI" />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What does this tool do?" rows={2} />
            </div>
            <div className="form-group">
              <label>Risk Notes</label>
              <textarea value={formData.risk_notes} onChange={(e) => setFormData({ ...formData, risk_notes: e.target.value })} placeholder="Any data privacy or compliance concerns..." rows={2} />
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!formData.name.trim() || !formData.category || saving}>
                {saving ? 'Saving...' : editingTool ? 'Update Tool' : 'Register Tool'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIToolRegistry;
