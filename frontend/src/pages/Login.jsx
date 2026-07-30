import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api';
import { useAuth } from '../context/AuthContext';
import useTheme from '../hooks/useTheme';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { user, loading: authLoading, loginUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.role === 'admin' ? '/admin' : user.role === 'management' ? '/management' : '/engineer', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError('All fields required'); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Enter a valid email address'); return; }
    setLoading(true); setError('');
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : res.data.user.role === 'management' ? '/management' : '/engineer');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return <div className="flex-center" style={{ height: '100vh' }}><span className="spinner spinner-dark" /></div>;
  }

  return (
    <div className="login-page">
      <button type="button" className="theme-toggle-btn login-theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀️' : '🌙'}</button>
      <div className="login-card">
        <div className="login-logo-row">
          <img src="/logos/abdm.png" alt="ABDM" className="login-logo-img" />
          <div className="login-logo-divider" />
          <div className="login-logo-text">
            <h2>Staff Portal</h2>
            <p>JH Health WiFi Complaint System</p>
          </div>
          <div className="login-logo-divider" />
          <img src="/logos/bsnl.png" alt="BSNL" className="login-logo-img" />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-control" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="pw-input-wrap">
            <input className="form-control" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            <button type="button" className="pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? '👁' : '👁‍🗨'}
            </button>
          </div>
        </div>

        <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
        </button>

        <div className="text-center mt-3">
          <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>← Back to complaint form</Link>
        </div>

      </div>
    </div>
  );
}
