import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

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
