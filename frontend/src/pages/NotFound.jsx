import { Link } from 'react-router-dom';
import useTheme from '../hooks/useTheme';
import MaterialIcon from '../components/MaterialIcon';

export default function NotFound() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #f8fafc)',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{
          position: 'fixed', top: 16, right: 16,
          background: 'var(--bg-secondary, #f1f5f9)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: '1.1rem'
        }}
      >
        <MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
      </button>
      <div style={{
        maxWidth: 480,
        textAlign: 'center',
        background: 'var(--bg-primary, #fff)',
        borderRadius: 16,
        padding: '48px 32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <div style={{
          fontSize: '5rem',
          fontWeight: 800,
          color: 'var(--primary, #0F4C81)',
          lineHeight: 1,
          marginBottom: 8
        }}>
          404
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem', color: 'var(--text-primary, #1e293b)' }}>
          Page Not Found
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.6 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--primary, #0F4C81)',
            color: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}>
            Go to Complaint Form
          </Link>
          <Link to="/login" style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: '1px solid var(--border-color, #e2e8f0)',
            background: 'transparent',
            color: 'var(--text-primary, #1e293b)',
            fontWeight: 500,
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}>
            Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
}
