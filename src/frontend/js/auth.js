// Shared helpers for talking to the /api/auth endpoints and managing the JWT session.
// Imported by login.js and register.js as an ES module.

const AUTH_API_URL = '/api/auth';

/** Sends a login request. Returns the parsed response body — caller checks response.ok. */
export const loginRequest = async (username, password) => {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
};

/** Sends a registration request. Returns the parsed response body — caller checks response.ok. */
export const registerRequest = async (username, password) => {
  const response = await fetch(`${AUTH_API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
};

/** Loads the public profile after the whitepaper login response returns a token. */
export const getCurrentUser = async (token) => {
  const response = await fetch('/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  return await response.json();
};

/** Persists the JWT and public user info in localStorage after a successful login. */
export const saveSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

/** Returns the stored JWT, or null if no session exists. */
export const getToken = () => localStorage.getItem('token');

/** Extracts a friendly error message from a failed auth response. */
export const getErrorMessage = (data) => {
  return data?.error?.message || data?.message || data?.error || 'Something went wrong. Please try again.';
};

/** Clears the session and sends the survivor back to sign in. */
export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Fetch wrapper for every authenticated /api/me and catalogue call the game views make.
 * Attaches the bearer token, JSON-encodes a body when given, and normalizes the result to
 * { ok, status, data } so callers never touch Response objects directly. A 401 means the
 * session is dead (expired/forged token, or the account no longer exists) — redirecting here
 * once means no game view has to duplicate that check.
 */
export const authedFetch = async (path, { method = 'GET', body } = {}) => {
  const token = getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearSession();
    window.location.href = 'index.html';
    return { ok: false, status: 401, data: null };
  }

  const data = response.status === 204 ? null : await response.json();
  return { ok: response.ok, status: response.status, data };
};
