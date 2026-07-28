/*
 * Framework-agnostic API client. No React in here on purpose — it's just the network layer,
 * the same separation the backend keeps between its models and its HTTP controllers. In dev
 * every /api call is proxied to the Express server by Vite (see vite.config.js), so requests
 * are same-origin and there's no base URL to configure.
 */

/** Pull a human-friendly message out of the backend's { error: { message } } / { message } shapes. */
export const extractErrorMessage = (data) =>
  data?.error?.message || data?.message || data?.error || 'Something went wrong. Please try again.';

/** POST a JSON body and normalise the result to { ok, status, data }. */
const postJson = async (path, body) => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json();
  return { ok: response.ok, status: response.status, data };
};

export const loginRequest = (username, password) => postJson('/api/auth/login', { username, password });
export const registerRequest = (username, password) => postJson('/api/auth/register', { username, password });

/** Loads the authenticated survivor's own record. Used right after login to seed the session. */
export const fetchCurrentUser = async (token) => {
  const response = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  return response.json();
};

/**
 * Authenticated fetch for every protected call the game views make. Attaches the bearer token,
 * JSON-encodes a body when given, and returns { ok, status, data }. A 401 is surfaced (not
 * swallowed) so the auth layer can react by ending the session — callers never handle logout.
 */
export const authedFetch = async (path, token, { method = 'GET', body } = {}) => {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = response.status === 204 ? null : await response.json();
  return { ok: response.ok, status: response.status, data };
};

/* ---- session persistence ---- */
const TOKEN_KEY = 'cc_token';
const USER_KEY = 'cc_user';

export const readStoredSession = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    return { token, user: JSON.parse(localStorage.getItem(USER_KEY) || 'null') };
  } catch {
    return { token, user: null };
  }
};

export const writeStoredSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
