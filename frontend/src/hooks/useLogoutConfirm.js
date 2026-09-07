import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MaterialIcon from '../components/MaterialIcon';

export function useLogoutConfirm() {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmLogout = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    logoutUser();
    navigate('/login');
  }, [logoutUser, navigate]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  useEffect(() => {
    if (!showConfirm) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setShowConfirm(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showConfirm]);

  const LogoutConfirmModal = showConfirm ? (
    <div className="modal-overlay" onClick={handleCancel} onKeyDown={(e) => { if (e.key === 'Escape') handleCancel(); }} style={{ zIndex: 9999 }}>
      <div className="modal glass-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirm Logout" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcon name="logout" size={20} color="var(--danger)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Confirm Logout</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleCancel} aria-label="Close">
            <MaterialIcon name="close" size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Are you sure you want to log out? You will need to sign in again.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={handleCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MaterialIcon name="logout" size={16} /> Yes, Log Out
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirmLogout, LogoutConfirmModal };
}

export function useUnsavedChangesWarning(hasUnsavedChanges) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);
}
