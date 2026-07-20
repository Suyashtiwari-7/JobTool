/**
 * Backend API client — handles all HTTP communication with the FastAPI backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jobtool-3xdj.onrender.com';

/**
 * Get the auth token from localStorage.
 */
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jobtool_token');
}

/**
 * Save auth token.
 */
export function setToken(token) {
  localStorage.setItem('jobtool_token', token);
}

/**
 * Remove auth token.
 */
export function removeToken() {
  localStorage.removeItem('jobtool_token');
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Make an authenticated API request.
 */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// ── Auth ────────────────────────────────────────────────

export async function login(password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  setToken(data.access_token);
  return data;
}

export async function checkAuth() {
  return apiFetch('/api/auth/me');
}

// ── Filters ─────────────────────────────────────────────

export async function getActiveFilter() {
  return apiFetch('/api/filters');
}

export async function createFilter(filterData) {
  return apiFetch('/api/filters', {
    method: 'POST',
    body: JSON.stringify(filterData),
  });
}

export async function getCountries() {
  return apiFetch('/api/filters/countries');
}

export async function getExperienceLevels() {
  return apiFetch('/api/filters/experience-levels');
}

// ── Resume ──────────────────────────────────────────────

export async function getResume() {
  return apiFetch('/api/resume');
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/api/resume/upload', {
    method: 'POST',
    body: formData,
  });
}

// ── Applications ────────────────────────────────────────

export async function getStats() {
  return apiFetch('/api/applications/stats');
}

export async function getApplications(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.batch_id) query.set('batch_id', params.batch_id);
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  const qs = query.toString();
  return apiFetch(`/api/applications${qs ? `?${qs}` : ''}`);
}

export async function getApplication(id) {
  return apiFetch(`/api/applications/${id}`);
}

export async function updateApplicationStatus(id, status, notes) {
  return apiFetch(`/api/applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

export function getResumePdfUrl(id) {
  return `${API_URL}/api/applications/${id}/resume-pdf`;
}

export function getCoverLetterPdfUrl(id) {
  return `${API_URL}/api/applications/${id}/cover-letter-pdf`;
}

// ── Pipeline ────────────────────────────────────────────

export async function triggerPipeline() {
  return apiFetch('/api/pipeline/run', { method: 'POST' });
}

export async function getPipelineStatus() {
  return apiFetch('/api/pipeline/status');
}

export async function getPipelineHistory() {
  return apiFetch('/api/pipeline/history');
}

// ── Settings ────────────────────────────────────────────

export async function getCompanies(source) {
  const query = source ? `?source=${source}` : '';
  return apiFetch(`/api/settings/companies${query}`);
}

export async function updateCompanies(companies) {
  return apiFetch('/api/settings/companies', {
    method: 'PUT',
    body: JSON.stringify({ companies }),
  });
}

export async function seedCompanies() {
  return apiFetch('/api/settings/companies/seed', { method: 'POST' });
}

export async function getLLMStatus() {
  return apiFetch('/api/settings/llm-status');
}
