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

/** Persists the JWT and public user info in localStorage after a successful login. */
export const saveSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

/** Returns the stored JWT, or null if no session exists. */
export const getToken = () => localStorage.getItem('token');

/** Extracts a friendly error message from a failed auth response. */
export const getErrorMessage = (data) => {
  return data?.error?.message || 'Something went wrong. Please try again.';
};
