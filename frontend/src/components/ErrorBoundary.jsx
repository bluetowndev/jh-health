import { Component } from 'react';
import MaterialIcon from './MaterialIcon';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
          <div style={{
            maxWidth: 480,
            textAlign: 'center',
            background: 'var(--bg-primary, #fff)',
            borderRadius: 16,
            padding: '48px 32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ marginBottom: 16 }}><MaterialIcon name="error" size={48} color="#E8741A" /></div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', color: 'var(--text-primary, #1e293b)' }}>
              Something went wrong
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.6 }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary, #0F4C81)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color, #e2e8f0)',
                  background: 'transparent',
                  color: 'var(--text-primary, #1e293b)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre style={{
                marginTop: 24,
                padding: 12,
                background: '#fee2e2',
                borderRadius: 8,
                fontSize: '0.75rem',
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 200,
                color: '#991b1b'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
