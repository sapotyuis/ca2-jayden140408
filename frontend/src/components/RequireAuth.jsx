import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard for the survivor-only views (camp + voyage). With no session it redirects to the
 * login page instead of rendering — the client-side mirror of the backend's verifyToken
 * middleware, which rejects the same requests with 401. `replace` keeps the protected URL out
 * of history so the back button doesn't bounce a signed-out user into a dead page.
 */
export default function RequireAuth({ children }) {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/" replace />;
  return children;
}
