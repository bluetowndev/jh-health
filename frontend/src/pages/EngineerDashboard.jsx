import { useState, useEffect } from 'react';
import { getComplaints, updateComplaintStatus } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';

export default function EngineerDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ status: 'open', district: '', facilityType: '' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [formData, setFormData] = useState({ status: '', notes: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'engineer') { navigate('/login'); return; }
    loadComplaints();
  }, [user, filter, page]);

  const loadComplaints = () => {
    getComplaints({ ...filter, page, limit: 12 }).then(r => {
      setComplaints(r.data.complaints);
      setTotal(r.data.total);
    });
  };

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const openModal = (c) => {
    setSelected(c);
    setFormData({ status: c.status, notes: '', otp: '' });
    setAwaitingOtp(false);
    setModal(true);
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const payload = { status: formData.status, notes: formData.notes };
      if (formData.status === 'resolved' && formData.otp) payload.otp = formData.otp;

      const res = await updateComplaintStatus(selected._id, payload);

      if (res.data?.requiresOtp) {
        setAwaitingOtp(true);
        setMsg(res.data.message || 'OTP sent to complainant. Enter the code they provide.');
      } else {
        setModal(false);
        setAwaitingOtp(false);
        setMsg(`✅ Ticket ${selected.ticketId} updated to "${formData.status}"`);
        loadComplaints();
        setTimeout(() => setMsg(''), 4000);
      }
    } catch(e) {
      const errMsg = e.response?.data?.error || e.response?.data?.message || 'Failed';
      alert(errMsg);
    }
    finally { setLoading(false); }
  };

  const statusCounts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
  // We'll approximate from the current load

  return (
    <div className="page-wrapper">
      <nav className="navbar">
        <div className="navbar-inner navbar-inner-split">
          <div className="navbar-logo-slot navbar-logo-slot--left">
            <img src="/logos/abdm.png" alt="ABDM" className="navbar-logo-img" />
          </div>
          <div className="navbar-brand-center">
            <span className="navbar-title">डिजिटल संचार साथी</span>
            <span className="navbar-subtitle">स्वास्थ्य और संचार, हर कदम आपके साथ</span>
          </div>
          <div className="navbar-logo-slot navbar-logo-slot--right">
            <img src="/logos/bsnl.png" alt="BSNL" className="navbar-logo-img" />
            <div className="navbar-actions navbar-actions--compact">
              <span className="navbar-user navbar-user--compact">{user?.name}</span>
              <span className="navbar-role navbar-role--compact" style={{ background: 'var(--accent)' }}>Engineer</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { logoutUser(); navigate('/login'); }} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="form-content content-wide" style={{ flex: 1 }}>
        {msg && <div className="alert alert-success mb-3">{msg}</div>}

        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2>My Assigned Complaints</h2>
              <p className="text-sm text-muted mt-1">Viewing {total} complaints assigned to you</p>
            </div>
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {[['open','Open'],['in_progress','In Progress'],['resolved','Resolved'],['closed','Closed'],['','All']].map(([s, label]) => (
              <button key={s} className={`btn btn-sm ${filter.status === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setFilter(f => ({ ...f, status: s })); setPage(1); }}>
                {label}
              </button>
            ))}
            <input className="form-control" style={{ maxWidth: 180, padding: '6px 12px', fontSize: '0.85rem' }} placeholder="Filter by district..." value={filter.district} onChange={e => { setFilter(f => ({ ...f, district: e.target.value })); setPage(1); }} />
            <select className="form-control" style={{ maxWidth: 160, padding: '6px 12px', fontSize: '0.85rem' }} value={filter.facilityType} onChange={e => { setFilter(f => ({ ...f, facilityType: e.target.value })); setPage(1); }}>
              <option value="">All Types</option>
              {['DH','SDH','CHC','PHC','UPHC','HSC'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-3" style={{ gap: 16 }}>
          {complaints.length === 0 && (
            <div className="card" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state"><div className="empty-icon">🎉</div><div className="empty-title">No tickets found</div><div className="empty-desc">No {filter.status || ''} tickets assigned to you right now!</div></div>
            </div>
          )}
          {complaints.map(c => (
            <div key={c._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ padding: '14px 18px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>{c.ticketId}</span>
                <StatusBadge status={c.status} />
              </div>
              <div className="card-body" style={{ padding: '16px 18px', flex: 1 }}>
                <div className="font-semibold" style={{ marginBottom: 4 }}>{c.userName}</div>
                <div className="text-sm text-muted">{c.mobile}</div>
                <div className="mt-2" style={{ padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 8 }}>
                  <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Facility</div>
                  <div className="text-sm font-semibold mt-1">{c.facilityName}</div>
                  <div className="text-xs text-muted">{c.district} · {c.facilityType}</div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Issue</div>
                  <div className="text-sm" style={{ color: 'var(--gray-700)' }}>{Array.isArray(c.issueCategory) ? c.issueCategory.join(', ') : c.issueCategory}</div>
                  {c.issueDescription && <div className="text-xs text-muted mt-1">{c.issueDescription}</div>}
                </div>
                <div className="text-xs text-muted mt-2">Submitted: {fmt(c.createdAt)}</div>
              </div>
              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--gray-100)' }}>
                <button className="btn btn-primary btn-sm btn-block" onClick={() => openModal(c)}>
                  Update Ticket
                </button>
              </div>
            </div>
          ))}
        </div>

        {total > 12 && (
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-muted">Showing {(page - 1) * 12 + 1}–{Math.min(page * 12, total)} of {total}</span>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {modal && selected && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Update Ticket</h3>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--primary)', marginTop: 2 }}>{selected.ticketId}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '12px', background: 'var(--gray-50)', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>
                <strong>{selected.facilityName}</strong><br />
                <span className="text-muted">{Array.isArray(selected.issueCategory) ? selected.issueCategory.join(', ') : selected.issueCategory}</span>
                {selected.issueDescription && <div className="text-xs text-muted mt-1">{selected.issueDescription}</div>}
                {(selected.attachmentUrls || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {(selected.attachmentUrls || []).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" title="View attachment">
                        <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--gray-200)' }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {awaitingOtp ? (
                <>
                  <div className="alert alert-info mb-3">
                    OTP has been sent to <strong>{selected.email}</strong>. Ask the complainant for the 6-digit code and enter it below.
                  </div>
                  <div className="form-group">
                    <label className="form-label">Enter OTP from Complainant</label>
                    <input className="form-control" placeholder="e.g. 123456" maxLength={6} value={formData.otp} onChange={e => setFormData(d => ({ ...d, otp: e.target.value.replace(/\D/g, '') }))} style={{ fontFamily: 'var(--mono)', letterSpacing: '0.2em', fontSize: '1.2rem' }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Update Status</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData(d => ({ ...d, status: e.target.value }))}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resolution / Work Notes</label>
                    <textarea className="form-control" rows={4} placeholder="Describe what was done to resolve the issue..." value={formData.notes} onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(false); setAwaitingOtp(false); }}>Cancel</button>
              <button className="btn btn-success" onClick={handleUpdate} disabled={loading || (awaitingOtp && formData.otp.length !== 6)}>
                {loading ? <span className="spinner" /> : awaitingOtp ? '✓ Confirm Resolution' : (formData.status === 'resolved' || formData.status === 'closed' ? '✓ Close Ticket' : 'Update Status')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}