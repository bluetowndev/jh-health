import { useEffect, useState } from 'react';
import { trackComplaintsByContact, trackComplaint } from '../api';
import Navbar from '../components/Navbar';
import HomeHeroBanner from '../components/HomeHeroBanner';
import PublicFooter from '../components/PublicFooter';
import StatusBadge from '../components/StatusBadge';

export default function TrackTicket() {
  const [mode, setMode] = useState('email'); // 'email' | 'mobile' | 'ticketId'
  const [email, setEmail] = useState(localStorage.getItem('trackEmail') || '');
  const [mobile, setMobile] = useState(localStorage.getItem('trackMobile') || '');
  const [ticketIdInput, setTicketIdInput] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If we already have stored contact, auto-search for a smoother UX.
    const hasEmail = !!(localStorage.getItem('trackEmail') || '').trim();
    const hasMobile = !!(localStorage.getItem('trackMobile') || '').trim();
    if (hasEmail) setMode('email');
    else if (hasMobile) setMode('mobile');
  }, []);

  const search = async () => {
    setLoading(true);
    setError('');
    setComplaints([]);
    try {
      if (mode === 'ticketId') {
        const tid = (ticketIdInput || '').trim().toUpperCase();
        if (!tid) { setError('Enter a ticket ID.'); setLoading(false); return; }
        const res = await trackComplaint(tid);
        setComplaints(res.data ? [res.data] : []);
        return;
      }

      const query = {};
      if (mode === 'email') {
        const normalized = (email || '').toLowerCase().trim();
        if (!/\S+@\S+\.\S+/.test(normalized)) {
          setError('Enter a valid email address.');
          setLoading(false); return;
        }
        query.email = normalized;
      } else {
        const normalizedMobile = (mobile || '').trim();
        if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
          setError('Enter a valid 10-digit mobile number.');
          setLoading(false); return;
        }
        query.mobile = normalizedMobile;
      }

      const res = await trackComplaintsByContact(query);
      setComplaints(res.data?.complaints || []);
    } catch (e) {
      if (e.response?.status === 404) {
        setComplaints([]);
      } else {
        setError(e.response?.data?.message || 'Could not fetch tracking details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const fmtIssues = (cat) => {
    if (Array.isArray(cat)) return cat.length ? cat.join(', ') : '—';
    return cat || '—';
  };

  return (
    <div className="page-wrapper">
      <div className="home-gradient-wrap">
      <Navbar />
      <HomeHeroBanner />
      <div className="home-public-bg">
        <div className="track-wrapper">
          <div className="text-center mb-4">
            <h2>Track Your Complaint</h2>
            <p className="text-muted mt-1">Enter your email or mobile to see your complaints status</p>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <div className="track-tabs">
                <button type="button" className={`track-tab ${mode === 'email' ? 'active' : ''}`} onClick={() => setMode('email')}>📧 Track by Email</button>
                <button type="button" className={`track-tab ${mode === 'mobile' ? 'active' : ''}`} onClick={() => setMode('mobile')}>📱 Track by Mobile</button>
                <button type="button" className={`track-tab ${mode === 'ticketId' ? 'active' : ''}`} onClick={() => setMode('ticketId')}>🎫 Track by Ticket ID</button>
              </div>

              {mode === 'email' ? (
                <div className="flex gap-2 track-search-row" style={{ alignItems: 'center' }}>
                  <input
                    className="form-control"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    style={{ fontFamily: 'var(--mono)', letterSpacing: '0.02em' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      localStorage.setItem('trackEmail', email);
                      localStorage.removeItem('trackMobile');
                      search();
                    }}
                    disabled={loading}
                    style={{ flexShrink: 0 }}
                  >
                    {loading ? <span className="spinner" /> : '🔍 Search'}
                  </button>
                </div>
              ) : mode === 'mobile' ? (
                <div className="flex gap-2 track-search-row" style={{ alignItems: 'center' }}>
                  <input
                    className="form-control"
                    placeholder="10-digit mobile"
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    style={{ fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      localStorage.setItem('trackMobile', mobile);
                      localStorage.removeItem('trackEmail');
                      search();
                    }}
                    disabled={loading}
                    style={{ flexShrink: 0 }}
                  >
                    {loading ? <span className="spinner" /> : '🔍 Search'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 track-search-row" style={{ alignItems: 'center' }}>
                  <input
                    className="form-control"
                    placeholder="e.g. JH-2501-00001"
                    value={ticketIdInput}
                    onChange={e => setTicketIdInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    style={{ fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={search}
                    disabled={loading}
                    style={{ flexShrink: 0 }}
                  >
                    {loading ? <span className="spinner" /> : '🔍 Search'}
                  </button>
                </div>
              )}
              {error && <div className="alert alert-error mt-2">{error}</div>}
            </div>
          </div>

          {loading ? (
            <div className="card mb-3">
              <div className="card-header">
                <div className="skel" style={{ width: 180, height: 20, marginBottom: 8 }} />
                <div className="skel" style={{ width: 100, height: 24, borderRadius: 12 }} />
              </div>
              <div className="card-body">
                <div className="grid-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <div className="skel" style={{ width: 80, height: 12, marginBottom: 6 }} />
                      <div className="skel" style={{ width: 140, height: 16 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center text-muted" style={{ padding: '18px 0' }}>
              No complaints found for the provided contact.
            </div>
          ) : (
            <div className="mb-3 text-sm" style={{ color: 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Found <strong style={{ color: 'var(--primary)' }}>{complaints.length}</strong> complaint{complaints.length !== 1 ? 's' : ''}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ Print</button>
            </div>
          )}
          <div className="fade-in-results">{!loading && complaints.length > 0 && complaints.map((complaint) => (
              <div key={complaint._id || complaint.ticketId} className="card mb-3">
                <div className="card-header">
                  <div>
                    <div
                      className="text-xs text-muted font-semibold"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}
                    >
                      Ticket ID
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>
                      {complaint.ticketId}
                    </div>
                    <div className="text-sm text-muted" style={{ marginTop: 4 }}>{fmt(complaint.createdAt)}</div>
                  </div>
                  <StatusBadge status={complaint.status} />
                </div>
                <div className="card-body">
                  <div className="grid-2 mb-3">
                    {[
                      ['District', complaint.district],
                      ['Facility', complaint.facilityName],
                      ['Facility Type', complaint.facilityType],
                      ['Issue', fmtIssues(complaint.issueCategory)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: 12 }}>
                        <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--gray-700)', marginTop: 3 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {complaint.issueDescription && (
                    <div className="mb-3">
                      <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        Additional Details
                      </div>
                      <div className="text-sm" style={{ color: 'var(--gray-700)' }}>{complaint.issueDescription}</div>
                    </div>
                  )}
                  {(complaint.attachmentUrls || []).length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                        Attachments
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(complaint.attachmentUrls || []).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Attachment ${i + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gray-200)' }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {complaint.resolutionNotes && (
                    <div className="alert alert-success">
                      <div><strong>Resolution Notes:</strong><br />{complaint.resolutionNotes}</div>
                    </div>
                  )}
                  {complaint.activityLog && complaint.activityLog.length > 0 && (
                    <div className="mt-3" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}>
                      <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        Timeline
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {complaint.activityLog.map((entry, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < complaint.activityLog.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginTop: 6, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div className="text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>{entry.action}</div>
                              <div className="text-xs text-muted">
                                {entry.performedBy && <span>{entry.performedBy} &middot; </span>}
                                {entry.timestamp ? fmt(entry.timestamp) : ''}
                              </div>
                              {entry.notes && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{entry.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
      <PublicFooter />
    </div>
  );
}
