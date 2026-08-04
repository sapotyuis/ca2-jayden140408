import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';
import Button from '../components/Button';
import form from './authForm.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password) {
      setError('Please enter both a username and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      const result = await register(username.trim(), password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess('Account created. Redirecting to sign in…');
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      tone="dawn"
      status="Create a new survivor account"
      title="Create your survivor account"
      lede="Create an account to start playing."
      footer={
        <>
          Already have an account? <Link to="/">Sign in.</Link>
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
            placeholder="Enter your survivor name"
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
            placeholder="Enter a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            minLength={6}
            required
          />
          <p className={form.hint}>Password must be at least 6 characters.</p>
        </div>

        {error && (
          <p className={`${form.message} ${form.error}`} role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className={`${form.message} ${form.success}`} role="status">
            {success}
          </p>
        )}

        <Button type="submit" className={form.submit} loading={busy} variant="lantern" size="lg" style={{ width: '100%' }}>
          CREATE ACCOUNT
        </Button>
      </form>
    </AuthShell>
  );
}
