import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorldClockProvider } from './context/WorldClockContext';
import { ToastProvider } from './components/ToastProvider';
import PhaseTheme from './components/PhaseTheme';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LeaderboardPage from './pages/LeaderboardPage';
import GamePage from './pages/GamePage';

// The voyage pulls in Three.js + post-processing (~500 kB). Lazy-loading it keeps that weight
// out of the login/dashboard bundle — those pages load fast, and the 3D code only downloads
// when a survivor actually sets sail.
const OceanPage = lazy(() => import('./pages/OceanPage'));

/**
 * App shell: providers wrap the whole tree (auth session + toasts), then React Router maps the
 * four screens. `/` is login, `/camp` is the dashboard, `/voyage` is the 3D ocean — the two
 * survivor views sit behind <RequireAuth>. This is the "logical, clear navigation between
 * pages" the brief asks for, expressed as routes rather than raw window.location hops.
 */
export default function App() {
  return (
    <AuthProvider>
      <WorldClockProvider>
        <PhaseTheme />
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route
                path="/camp"
                element={
                  <RequireAuth>
                    <GamePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/voyage"
                element={
                  <RequireAuth>
                    <Suspense fallback={<div style={{ padding: 40, color: '#ecdfbe' }}>Loading Castaway Chronicles…</div>}>
                      <OceanPage />
                    </Suspense>
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </WorldClockProvider>
    </AuthProvider>
  );
}
