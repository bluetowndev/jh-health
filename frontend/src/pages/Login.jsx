import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api';
import { useAuth } from '../context/AuthContext';
import useTheme from '../hooks/useTheme';
import MaterialIcon from '../components/MaterialIcon';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { user, loading: authLoading, loginUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.role === 'admin' ? '/admin' : user.role === 'management' ? '/management' : user.role === 'teamLead' ? '/team-lead' : '/engineer', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async () => {
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setError('');
    if (!form.email) { setEmailError('Email is required'); hasError = true; }
    else if (!/\S+@\S+\.\S+/.test(form.email)) { setEmailError('Enter a valid email address'); hasError = true; }
    if (!form.password) { setPasswordError('Password is required'); hasError = true; }
    if (hasError) return;
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : res.data.user.role === 'management' ? '/management' : res.data.user.role === 'teamLead' ? '/team-lead' : '/engineer');
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
      <button type="button" className="theme-toggle-btn login-theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        <MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
      </button>
      <div className="login-card glass-login">
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
          <input className="form-control glass-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailError(''); }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          {emailError && <div className="form-error">{emailError}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="pw-input-wrap">
            <input className="form-control glass-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setPasswordError(''); }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            <button type="button" className="pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {passwordError && <div className="form-error">{passwordError}</div>}
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
