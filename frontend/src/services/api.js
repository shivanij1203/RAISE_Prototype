import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
});

// Auth
export async function registerUser(email, password, fullName, role) {
  const res = await api.post('/auth/register', { email, password, full_name: fullName, role });
  return res.data;
}

export async function loginUser(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function logoutUser() {
  const res = await api.post('/auth/logout');
  return res.data;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}

// Consent
export async function submitConsent(data) {
  const res = await api.post('/research/consent', data);
  return res.data;
}

// Session tracking
export async function startSession(participantCode, initialScenario) {
  const res = await api.post('/research/session/start', {
    participant_code: participantCode,
    initial_scenario: initialScenario
  });
  return res.data;
}

export async function recordResponse(sessionCode, nodeKey, answerValue, answerLabel, order) {
  const res = await api.post('/research/session/response', {
    session_code: sessionCode,
    node_key: nodeKey,
    answer_value: answerValue,
    answer_label: answerLabel,
    response_order: order
  });
  return res.data;
}

export async function completeSession(sessionCode, terminalNode, riskLevel) {
  const res = await api.post('/research/session/complete', {
    session_code: sessionCode,
    terminal_node: terminalNode,
    risk_level: riskLevel
  });
  return res.data;
}

export async function fetchStats(category = null) {
  const params = category ? `?category=${category}` : '';
  const res = await api.get(`/analytics/stats${params}`);
  return res.data;
}

export async function fetchInsights() {
  const res = await api.get('/analytics/insights');
  return res.data;
}

export async function fetchCategories() {
  const res = await api.get('/analytics/categories');
  return res.data;
}

export async function fetchAssessmentQuestions() {
  const res = await api.get('/assessment/questions');
  return res.data;
}

export async function submitAssessment(answers) {
  const res = await api.post('/assessment/submit', { answers });
  return res.data;
}

// Ethics Assistant API
export async function fetchEthicsStart() {
  const res = await api.get('/ethics/start');
  return res.data;
}

export async function fetchEthicsNode(nodeKey) {
  const res = await api.get(`/ethics/node/${nodeKey}`);
  return res.data;
}

export async function evaluateEthicsPath(answers) {
  const res = await api.post('/ethics/evaluate', { answers });
  return res.data;
}

export async function fetchTemplates() {
  const res = await api.get('/ethics/templates');
  return res.data;
}

export async function fetchTemplate(templateKey) {
  const res = await api.get(`/ethics/templates/${templateKey}`);
  return res.data;
}

export async function generateDocument(templateKey, fieldValues) {
  const res = await api.post('/ethics/generate', {
    template_key: templateKey,
    field_values: fieldValues
  });
  return res.data;
}
