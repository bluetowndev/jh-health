import { useState, useEffect, useCallback } from 'react';
import { getComplaints, getEngineerStats, updateComplaintStatus, acceptTicket } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import useTheme from '../hooks/useTheme';

const STATUS_COLORS = {
  open: '#1D4ED8',
  in_progress: '#B45309',
  resolved: '#1A7A4A',
  closed: '#64748B'
};

const PRIORITY_LABELS = { low: 'Low', medium: 'Med', high: 'High', critical: 'Critical' };
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priority', label: 'Priority (High→Low)' }
];

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function EngineerDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({ status: '', district: '', facilityType: '', search: '', startDate: '', endDate: '', sort: 'newest' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [formData, setFormData] = useState({ status: '', notes: '', otp: '' });
  const [saving, setSaving] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [expStart, setExpStart] = useState('');
  const [expEnd, setExpEnd] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'engineer') { navigate('/login'); return; }
    loadStats();
    loadComplaints();
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [filter, page]);

  const loadStats = async () => {
    try {
      const r = await getEngineerStats();
      setStats(r.data);
    } catch { /* silent */ }
  };

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (filter.status) params.status = filter.status;
      if (filter.district) params.district = filter.district;
      if (filter.facilityType) params.facilityType = filter.facilityType;
      if (filter.search) params.search = filter.search;
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;
      if (filter.sort && filter.sort !== 'newest') params.sort = filter.sort;
      const r = await getComplaints(params);
      setComplaints(r.data.complaints);
      setTotal(r.data.total);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (c) => {
    setSelected(c);
    setFormData({ status: c.status, notes: '', otp: '' });
    setAwaitingOtp(false);
    setModal(true);
  };

  const handleAccept = async (c) => {
    setAcceptingId(c._id);
    try {
      await acceptTicket(c._id);
      toast.success(`Ticket ${c.ticketId} accepted`);
      loadComplaints();
      loadStats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to accept ticket');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload = { status: formData.status, notes: formData.notes };
      if (formData.status === 'resolved' && formData.otp) payload.otp = formData.otp;
      const res = await updateComplaintStatus(selected._id, payload);
      if (res.data?.requiresOtp) {
        setAwaitingOtp(true);
        toast.success('OTP sent to complainant');
      } else {
        setModal(false);
        setAwaitingOtp(false);
        toast.success(`Ticket ${selected.ticketId} → ${formData.status}`);
        loadComplaints();
        loadStats();
      }
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const assignedDistrictInfo = user?.assignedDistricts?.length
    ? user.assignedDistricts.join(', ')
    : 'All districts';

  const hasActiveFilters = filter.status || filter.district || filter.facilityType || filter.search || filter.startDate || filter.endDate;

  const clearFilters = () => {
    setFilter({ status: '', district: '', facilityType: '', search: '', startDate: '', endDate: '', sort: 'newest' });
    setPage(1);
  };

  const doExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = { page: 1, limit: 10000 };
      if (expStart) params.startDate = expStart;
      if (expEnd) params.endDate = expEnd;
      const r = await getComplaints(params);
      const data = r.data.complaints;
      if (!data.length) { toast.error('No tickets to export for the selected date range'); setExporting(false); return; }

      const headers = ['Ticket ID', 'Status', 'Priority', 'User Name', 'Mobile', 'District', 'Facility', 'Type', 'Issue Category', 'Description', 'Created', 'Resolved', 'Resolution Notes'];
      const rows = data.map(c => [
        c.ticketId, c.status, c.priority, c.userName, c.mobile,
        c.district, c.facilityName, c.facilityType,
        Array.isArray(c.issueCategory) ? c.issueCategory.join('; ') : c.issueCategory,
        c.issueDescription || '', fmtDate(c.createdAt),
        c.resolvedAt ? fmtDate(c.resolvedAt) : '', c.resolutionNotes || ''
      ]);

      let content, mime, ext;

      if (exportFormat === 'excel') {
        let xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Tickets">';
        xml += '<Table><Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>';
        rows.forEach(r => { xml += '<Row>' + r.map(v => `<Cell><Data ss:Type="String">${String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('') + '</Row>'; });
        xml += '</Table></Worksheet></Workbook>';
        content = xml; mime = 'application/vnd.ms-excel'; ext = 'xls';
      } else if (exportFormat === 'pdf') {
        const win = window.open('', '_blank');
        const dateRange = expStart || expEnd ? ` | ${expStart || '…'} to ${expEnd || '…'}` : '';
        win.document.write(`<html><head><title>Engineer Tickets</title>
<style>body{font-family:Arial,sans-serif;margin:24px;font-size:12px}
h2{color:#0F4C81;margin-bottom:2px}.sub{color:#666;font-size:13px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th{background:#0F4C81;color:#fff;padding:7px 5px;text-align:left;font-size:10px}
td{padding:5px;border-bottom:1px solid #ddd;font-size:10px}
.footer{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
</style></head><body>
<h2>Digital Communication Saathi — Engineer Ticket Report</h2>
<div class="sub">${user?.name} (${user?.email})${dateRange} | ${data.length} tickets | Generated: ${new Date().toLocaleString('en-IN')}</div>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
${rows.map(r => `<tr>${r.map(v => `<td>${String(v ?? '')}</td>`).join('')}</tr>`).join('')}
</tbody></table>
<div class="footer">Digital Communication Saathi — Jharkhand Health WiFi Complaint Management System</div>
<script>window.onload=function(){window.print()}</script></body></html>`);
        win.document.close();
        setExporting(false); setShowExport(false);
        return;
      } else if (exportFormat === 'csv') {
        content = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
        mime = 'text/csv'; ext = 'csv';
      } else {
        const json = { generatedAt: new Date().toISOString(), engineer: user?.name, total: data.length, headers, data: rows.map((r, i) => {
          const obj = {}; headers.forEach((h, j) => obj[h] = r[j]); return obj;
        })};
        content = JSON.stringify(json, null, 2); mime = 'application/json'; ext = 'json';
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `engineer-tickets-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} tickets`);
    } catch {
      toast.error('Export failed');
    } finally { setExporting(false); setShowExport(false); }
  }, [exportFormat, expStart, expEnd, user]);

  // Skeleton loading
  if (loading && complaints.length === 0 && !stats) {
    return (
      <div>
        <nav className="navbar">
          <div className="navbar-inner navbar-inner-split">
            <div className="navbar-logo-slot navbar-logo-slot--left">
              <img src="/logos/abdm.png" alt="ABDM" className="navbar-logo-img" />
            </div>
            <div className="navbar-brand-center">
              <span className="navbar-title">Digital Communication Saathi</span>
              <span className="navbar-subtitle">Engineer Dashboard</span>
            </div>
            <div className="navbar-logo-slot navbar-logo-slot--right">
              <button type="button" className="theme-toggle-btn" onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
              <img src="/logos/bsnl.png" alt="BSNL" className="navbar-logo-img" />
              <div className="navbar-actions navbar-actions--compact">
                <span className="navbar-user navbar-user--compact">{user?.name}</span>
                <span className="navbar-role navbar-role--compact" style={{ background: 'var(--accent)' }}>Engineer</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { logoutUser(); navigate('/login'); }} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Logout</button>
              </div>
            </div>
          </div>
        </nav>
        <div className="form-content content-wide" style={{ flex: 1, padding: 24, maxWidth: 1200, margin: '0 auto' }}>
          <div className="engineer-summary-row" style={{ marginBottom: 20 }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skel" style={{ height: 64, flex: 1, borderRadius: 12 }} />)}
          </div>
          <div className="engineer-card-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="skel" style={{ height: 280, borderRadius: 12 }} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner navbar-inner-split">
          <div className="navbar-logo-slot navbar-logo-slot--left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{ color: 'white' }}>☰</button>
            <img src="/logos/abdm.png" alt="ABDM" className="navbar-logo-img" />
          </div>
          <div className="navbar-brand-center">
            <span className="navbar-title">Digital Communication Saathi</span>
            <span className="navbar-subtitle">Engineer Dashboard</span>
          </div>
          <div className="navbar-logo-slot navbar-logo-slot--right">
            <button type="button" className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀️' : '🌙'}</button>
            <img src="/logos/bsnl.png" alt="BSNL" className="navbar-logo-img" />
            <div className="navbar-actions navbar-actions--compact">
              <span className="navbar-user navbar-user--compact">{user?.name}</span>
              <span className="navbar-role navbar-role--compact" style={{ background: 'var(--accent)' }}>Engineer</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { logoutUser(); navigate('/login'); }} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Logout</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar-mobile ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-section">
          <div className="sidebar-label">Information</div>
          <div className="sidebar-link"><span>👤</span>{user?.name}</div>
          <div className="sidebar-link"><span>📍</span>{assignedDistrictInfo}</div>
          <div className="sidebar-link" onClick={() => { navigate('/'); setSidebarOpen(false); }}><span>🏠</span>Public Portal</div>
          <div className="sidebar-link" onClick={() => { logoutUser(); navigate('/login'); setSidebarOpen(false); }}><span>🚪</span>Logout</div>
        </div>
      </aside>

      <div className="form-content content-wide" style={{ flex: 1 }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2>My Tickets</h2>
            <p className="text-sm text-muted mt-1">{total} complaint{total !== 1 ? 's' : ''} · 📍 {assignedDistrictInfo}</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setShowExport(true)}>📥 Export</button>
        </div>

        {/* Stats row */}
        <div className="engineer-summary-row" style={{ marginBottom: 16 }}>
          {['open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button
              key={s}
              className={`engineer-summary-chip ${filter.status === s ? 'active' : ''}`}
              style={{ '--chip-color': STATUS_COLORS[s] }}
              onClick={() => { setFilter(f => ({ ...f, status: f.status === s ? '' : s })); setPage(1); }}
            >
              <span className="engineer-summary-chip-count">{stats ? stats[s] ?? 0 : '—'}</span>
              <span className="engineer-summary-chip-label">{s === 'in_progress' ? 'In Prog.' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </button>
          ))}
          <button
            className={`engineer-summary-chip ${filter.status === '' ? 'active' : ''}`}
            style={{ '--chip-color': '#64748B' }}
            onClick={() => { setFilter(f => ({ ...f, status: '' })); setPage(1); }}
          >
            <span className="engineer-summary-chip-count">{stats?.total ?? '—'}</span>
            <span className="engineer-summary-chip-label">Total</span>
          </button>
        </div>

        {/* Performance metrics */}
        {stats && (
          <div className="engineer-metrics-row">
            <div className="engineer-metric">
              <span className="engineer-metric-val">{stats.resolvedToday ?? 0}</span>
              <span className="engineer-metric-lbl">Today</span>
            </div>
            <div className="engineer-metric">
              <span className="engineer-metric-val">{stats.resolvedWeek ?? 0}</span>
              <span className="engineer-metric-lbl">This Week</span>
            </div>
            <div className="engineer-metric">
              <span className="engineer-metric-val">{stats.resolvedMonth ?? 0}</span>
              <span className="engineer-metric-lbl">This Month</span>
            </div>
            <div className="engineer-metric">
              <span className="engineer-metric-val">{stats.avgResolutionHours ?? 0}h</span>
              <span className="engineer-metric-lbl">Avg Resolution</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="engineer-filter-row" style={{ marginBottom: 16 }}>
          <div className="engineer-filter-group">
            <label className="form-label">Search</label>
            <input className="form-control" placeholder="Ticket ID, facility, name..." value={filter.search}
              onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1); }} />
          </div>
          <div className="engineer-filter-group">
            <label className="form-label">District</label>
            <input className="form-control" placeholder="Filter district..." value={filter.district}
              onChange={e => { setFilter(f => ({ ...f, district: e.target.value })); setPage(1); }} />
          </div>
          <div className="engineer-filter-group">
            <label className="form-label">Facility Type</label>
            <select className="form-control" value={filter.facilityType}
              onChange={e => { setFilter(f => ({ ...f, facilityType: e.target.value })); setPage(1); }}>
              <option value="">All Types</option>
              {['DH','SDH','CHC','PHC','UPHC','HSC'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="engineer-filter-group">
            <label className="form-label">From</label>
            <input type="date" className="form-control" value={filter.startDate}
              onChange={e => { setFilter(f => ({ ...f, startDate: e.target.value })); setPage(1); }} />
          </div>
          <div className="engineer-filter-group">
            <label className="form-label">To</label>
            <input type="date" className="form-control" value={filter.endDate}
              onChange={e => { setFilter(f => ({ ...f, endDate: e.target.value })); setPage(1); }} />
          </div>
          <div className="engineer-filter-group">
            <label className="form-label">Sort</label>
            <select className="form-control" value={filter.sort}
              onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <div className="engineer-filter-group engineer-filter-clear">
              <label className="form-label">&nbsp;</label>
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Clear</button>
            </div>
          )}
        </div>

        {/* Loading overlay for subsequent loads */}
        {loading && complaints.length > 0 && (
          <div className="flex-center" style={{ padding: '8px 0', gap: 8 }}>
            <span className="spinner spinner-dark" style={{ width: 16, height: 16 }} />
            <span className="text-sm text-muted">Refreshing...</span>
          </div>
        )}

        {/* Ticket grid */}
        <div className="engineer-card-grid">
          {!loading && complaints.length === 0 && (
            <div className="card" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state">
                <div className="empty-icon" style={{ fontSize: '2.5rem' }}>🎉</div>
                <div className="empty-title">No tickets found</div>
                <div className="empty-desc">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'No tickets assigned to you right now'}
                </div>
                {hasActiveFilters && (
                  <button className="btn btn-outline btn-sm mt-2" onClick={clearFilters}>Clear Filters</button>
                )}
              </div>
            </div>
          )}
          {complaints.map(c => (
            <div key={c._id} className="engineer-ticket-card" style={{ borderLeftColor: STATUS_COLORS[c.status] || '#CBD5E1' }}>
              <div className="engineer-ticket-header">
                <div className="engineer-ticket-header-left">
                  <span className="engineer-ticket-id">{c.ticketId}</span>
                  <span className={`badge badge-${c.priority}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{PRIORITY_LABELS[c.priority] || c.priority}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="engineer-ticket-body">
                <div className="engineer-ticket-name">{c.userName}</div>
                <div className="engineer-ticket-meta">
                  <a href={`tel:${c.mobile}`} className="engineer-ticket-phone" onClick={e => e.stopPropagation()}>📞 {c.mobile}</a>
                </div>
                <div className="engineer-ticket-facility">
                  <div className="engineer-ticket-facility-name">{c.facilityName}</div>
                  <div className="engineer-ticket-facility-sub">{c.district} · {c.facilityType}</div>
                </div>
                <div className="engineer-ticket-issues">
                  {Array.isArray(c.issueCategory) ? c.issueCategory.slice(0, 2).join(', ') : c.issueCategory}
                  {Array.isArray(c.issueCategory) && c.issueCategory.length > 2 && ` +${c.issueCategory.length - 2}`}
                </div>
                {c.issueDescription && <div className="engineer-ticket-desc">{c.issueDescription}</div>}
                <div className="engineer-ticket-date">{fmt(c.createdAt)}</div>
              </div>
              <div className="engineer-ticket-footer">
                {c.status === 'open' ? (
                  <button className="btn btn-success btn-sm btn-block" onClick={() => handleAccept(c)} disabled={acceptingId === c._id}>
                    {acceptingId === c._id ? <span className="spinner" /> : '✓ Accept Ticket'}
                  </button>
                ) : c.status === 'closed' || c.status === 'resolved' ? (
                  <div className="flex justify-between items-center" style={{ width: '100%' }}>
                    <span className="text-xs text-muted">
                      {c.status === 'resolved' ? '✅ Resolved' : '📦 Closed'} {c.resolvedAt && fmtShort(c.resolvedAt)}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => openModal(c)}>View</button>
                  </div>
                ) : (
                  <button className="btn btn-primary btn-sm btn-block" onClick={() => openModal(c)}>
                    Update Status
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {total > 12 && (
          <div className="flex justify-between items-center mt-4" style={{ padding: '12px 0' }}>
            <span className="text-sm text-muted">Page {page} · {(page - 1) * 12 + 1}–{Math.min(page * 12, total)} of {total}</span>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="modal-overlay" onClick={() => { if (!exporting) setShowExport(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>📥 Export Tickets</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowExport(false)} disabled={exporting}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Format</label>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {['excel', 'csv', 'pdf', 'json'].map(f => (
                    <button key={f} type="button"
                      className={`btn ${exportFormat === f ? 'btn-primary' : 'btn-outline'} btn-sm`}
                      onClick={() => setExportFormat(f)} disabled={exporting}>
                      {f === 'json' ? 'JSON' : f === 'excel' ? 'Excel' : f === 'csv' ? 'CSV' : 'PDF'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date Range (optional)</label>
                <div className="flex gap-2">
                  <input type="date" className="form-control" value={expStart} onChange={e => setExpStart(e.target.value)} disabled={exporting} placeholder="From" />
                  <input type="date" className="form-control" value={expEnd} onChange={e => setExpEnd(e.target.value)} disabled={exporting} placeholder="To" />
                </div>
                <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>Leave blank to export all assigned tickets</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowExport(false)} disabled={exporting}>Cancel</button>
              <button className="btn btn-primary" onClick={doExport} disabled={exporting}>
                {exporting ? <span className="spinner" /> : `Export ${exportFormat === 'json' ? 'JSON' : exportFormat === 'excel' ? 'Excel' : exportFormat === 'csv' ? 'CSV' : 'PDF'}`}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {/* Complaint info */}
              <div className="card" style={{ marginBottom: 16, padding: 12, background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                <div className="font-semibold text-sm">{selected.facilityName}</div>
                <div className="text-xs text-muted mt-1">{selected.district} · {selected.facilityType}</div>
                <div className="text-xs text-muted">
                  <a href={`tel:${selected.mobile}`} style={{ textDecoration: 'none' }}>📞 {selected.mobile}</a>
                  {' · '}{selected.email}
                </div>
                <div className="text-sm" style={{ marginTop: 8 }}>{Array.isArray(selected.issueCategory) ? selected.issueCategory.join(', ') : selected.issueCategory}</div>
                {selected.issueDescription && <div className="text-xs text-muted mt-1">{selected.issueDescription}</div>}
                {(selected.attachmentUrls || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {(selected.attachmentUrls || []).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--gray-200)' }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline / Activity Log */}
              {selected.activityLog && selected.activityLog.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="font-semibold text-sm mb-2">Activity Log</div>
                  <div className="eng-timeline">
                    {selected.activityLog.slice().reverse().map((entry, i) => (
                      <div key={i} className="eng-timeline-item">
                        <div className="eng-timeline-marker" />
                        <div className="eng-timeline-content">
                          <div className="eng-timeline-action">{entry.action}</div>
                          <div className="eng-timeline-meta">{entry.performedBy} ({entry.performedByRole}) · {fmt(entry.timestamp)}</div>
                          {entry.notes && <div className="eng-timeline-notes">{entry.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Update form */}
              {awaitingOtp ? (
                <>
                  <div className="alert alert-info mb-3" style={{ fontSize: '0.85rem' }}>
                    OTP sent to <strong>{selected.email}</strong>. Ask the complainant for the code.
                  </div>
                  <div className="form-group">
                    <label className="form-label">OTP from Complainant</label>
                    <input className="form-control" placeholder="e.g. 123456" maxLength={6} value={formData.otp} onChange={e => setFormData(d => ({ ...d, otp: e.target.value.replace(/\D/g, '') }))} style={{ fontFamily: 'var(--mono)', letterSpacing: '0.2em', fontSize: '1.2rem' }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData(d => ({ ...d, status: e.target.value }))}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Work Notes</label>
                    <textarea className="form-control" rows={4} placeholder="Describe what was done..." value={formData.notes} onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(false); setAwaitingOtp(false); }}>Cancel</button>
              <button className="btn btn-success" onClick={handleUpdate} disabled={saving || (awaitingOtp && formData.otp.length !== 6)}>
                {saving ? <span className="spinner" /> : awaitingOtp ? '✓ Confirm' : (formData.status === 'resolved' ? 'Mark Resolved' : 'Update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
