/*
 * Framework-agnostic API client. It's just the network layer,
 * the same separation the backend keeps between its models and its HTTP controllers. In dev
 * every /api call is proxied to the Express server by Vite (see vite.config.js), so requests
 * are same-origin and there's no base URL to configure.
 */

/** Pull a human-friendly message out of the backend's { error: { message } } / { message } shapes. */
export const extractErrorMessage = (data) =>
  data?.error?.message || data?.message || data?.error || 'Something went wrong. Please try again.';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const logRequestStarted = (method, path) => {
  console.log('[FRONTEND] API request started', { method, path });
};

const logResponseReceived = (method, path, response, startedAt) => {
  console.log('[FRONTEND] API response received', {
    method,
    path,
    status: response.status,
    request_id: response.headers.get('x-request-id') || null,
    duration_ms: Math.round(now() - startedAt),
  });
};

const logRequestFailed = (method, path, error, startedAt) => {
  console.error('[FRONTEND] API request failed', {
    method,
    path,
    message: error instanceof Error ? error.message : String(error),
    duration_ms: Math.round(now() - startedAt),
  });
};

/** POST a JSON body and normalise the result to { ok, status, data }. */
const postJson = async (path, body) => {
  const method = 'POST';
  const startedAt = now();
  logRequestStarted(method, path);

  try {
    const response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = response.status === 204 ? null : await response.json();
    logResponseReceived(method, path, response, startedAt);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    logRequestFailed(method, path, error, startedAt);
    throw error;
  }
};

export const loginRequest = (username, password) => postJson('/api/auth/login', { username, password });
export const registerRequest = (username, password) => postJson('/api/auth/register', { username, password });

/** Loads the authenticated survivor's own record. Used right after login to seed the session. */
export const fetchCurrentUser = async (token) => {
  const path = '/api/me';
  const method = 'GET';
  const startedAt = now();
  logRequestStarted(method, path);

  try {
    const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    logResponseReceived(method, path, response, startedAt);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    logRequestFailed(method, path, error, startedAt);
    throw error;
  }
};

/**
 * Authenticated fetch for every protected call the game views make. Attaches the bearer token,
 * JSON-encodes a body when given, and returns { ok, status, data }. A 401 is surfaced (not
 * swallowed) so the auth layer can react by ending the session — callers never handle logout.
 */
export const authedFetch = async (path, token, { method = 'GET', body } = {}) => {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const startedAt = now();
  logRequestStarted(method, path);

  try {
    const response = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = response.status === 204 ? null : await response.json();
    logResponseReceived(method, path, response, startedAt);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    logRequestFailed(method, path, error, startedAt);
    throw error;
  }
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
