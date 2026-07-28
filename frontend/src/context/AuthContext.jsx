import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  authedFetch,
  clearStoredSession,
  extractErrorMessage,
  fetchCurrentUser,
  loginRequest,
  readStoredSession,
  registerRequest,
  writeStoredSession,
} from '../lib/api';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/**
 * Owns the whole authenticated session for the app: the JWT + the survivor record, restored
 * from localStorage on load so a refresh keeps you signed in. Everything that touches the
 * network for a logged-in user goes through `api()` here, so the 401 → sign-out rule lives in
 * exactly one place: when the token is rejected, the session is cleared and any <RequireAuth>
 * boundary bounces the user back to the login page on the next render.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const { ok, data } = await loginRequest(username, password);
    if (!ok) return { ok: false, message: extractErrorMessage(data) };

    const user = await fetchCurrentUser(data.token);
    writeStoredSession(data.token, user);
    setSession({ token: data.token, user });
    return { ok: true };
  }, []);

  const register = useCallback(async (username, password) => {
    const { ok, data } = await registerRequest(username, password);
    if (!ok) return { ok: false, message: extractErrorMessage(data) };
    return { ok: true };
  }, []);

  /**
   * Authenticated request bound to the current token. On 401 it ends the session (the token is
   * dead — expired, forged, or the account is gone) and returns a normalised failure so callers
   * only ever branch on `ok`, never on auth mechanics.
   */
  const api = useCallback(
    async (path, opts) => {
      if (!session?.token) return { ok: false, status: 401, data: null };
      const result = await authedFetch(path, session.token, opts);
      if (result.status === 401) logout();
      return result;
    },
    [session, logout]
  );

  /** Refreshes the cached survivor record (e.g. after a rename) so the HUD stays in sync. */
  const setUser = useCallback((user) => {
    setSession((prev) => {
      if (!prev) return prev;
      writeStoredSession(prev.token, user);
      return { ...prev, user };
    });
  }, []);

  const value = useMemo(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      isAuthed: Boolean(session?.token),
      login,
      register,
      logout,
      api,
      setUser,
    }),
    [session, login, register, logout, api, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
