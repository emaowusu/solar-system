const BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  try { return localStorage.getItem('token'); } catch { return null; }
}

export async function request(path, { method = 'GET', body, token = getToken() } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}
