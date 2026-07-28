import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';
import Button from '../components/Button';
import form from './authForm.module.css';

export default function LoginPage() {
  const { isAuthed, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already signed in — skip the form and go straight to camp.
  useEffect(() => {
    if (isAuthed) navigate('/camp', { replace: true });
  }, [isAuthed, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both a username and password.');
      return;
    }

    setBusy(true);
    try {
      const result = await login(username.trim(), password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      navigate('/camp', { replace: true });
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      status="Ship's log — sign in"
      title="Return to the Raft"
      lede="Sign back into your log and take the helm."
      footer={
        <>
          New to the drift? <Link to="/register">Sign the manifest.</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} autoComplete="off" noValidate>
        <div className={form.field}>
          <label htmlFor="username">Survivor name</label>
          <input
            className={form.input}
            id="username"
            type="text"
            placeholder="driftwood_dan"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            required
          />
        </div>

        <div className={form.field}>
          <label htmlFor="password">Password</label>
          <input
            className={form.input}
            id="password"
            type="password"
            placeholder="Your secret"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            required
          />
        </div>

        {error && (
          <p className={`${form.message} ${form.error}`} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className={`${form.submit}`} loading={busy} variant="lantern" size="lg" style={{ width: '100%' }}>
          Take the Helm
        </Button>
      </form>
    </AuthShell>
  );
}
