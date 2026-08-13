// Manages the logged-in user session, authentication actions, and protected API access.
import {
  authedFetch,
  clearStoredSession,
  extractErrorMessage,
  fetchCurrentUser,
  loginRequest,
  readStoredSession,
  registerRequest,
  writeStoredSession,
} from './api.js';

export const createAuthStore = () => {
  let session = readStoredSession();
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener(getState()));
  const getState = () => ({
    token: session?.token || null,
    user: session?.user || null,
    isAuthed: Boolean(session?.token),
  });

  const logout = () => {
    clearStoredSession();
    session = null;
    notify();
  };

  const login = async (username, password) => {
    const { ok, data } = await loginRequest(username, password);
    if (!ok) {
      console.warn('[AUTH] frontend login rejected', { username, message: extractErrorMessage(data) });
      return { ok: false, message: extractErrorMessage(data) };
    }
    const user = await fetchCurrentUser(data.token);
    if (!user) return { ok: false, message: 'Could not load your survivor account.' };
    writeStoredSession(data.token, user);
    session = { token: data.token, user };
    console.log('[AUTH] frontend session established', { user_id: user?.user_id, username: user?.username });
    notify();
    return { ok: true };
  };

  const register = async (username, password) => {
    const { ok, data } = await registerRequest(username, password);
    if (!ok) {
      console.warn('[AUTH] frontend registration rejected', { username, message: extractErrorMessage(data) });
      return { ok: false, message: extractErrorMessage(data) };
    }
    console.log('[AUTH] frontend registration succeeded', { username });
    return { ok: true };
  };

  const api = async (path, options) => {
    if (!session?.token) return { ok: false, status: 401, data: null };
    const result = await authedFetch(path, session.token, options);
    if (result.status === 401) {
      console.warn('[AUTH] session rejected by API', { path, status: result.status });
      logout();
    }
    return result;
  };

  const setUser = (user) => {
    if (!session) return;
    writeStoredSession(session.token, user);
    session = { ...session, user };
    notify();
  };

  return {
    getState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    login,
    register,
    logout,
    api,
    setUser,
  };
};
