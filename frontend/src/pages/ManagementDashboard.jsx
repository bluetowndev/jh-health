import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { getManagementStats, getManagementComplaints, getDistricts, getEngineers, escapeHtml, escapeXml } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import MaterialIcon from '../components/MaterialIcon';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import useTheme from '../hooks/useTheme';
import { useLogoutConfirm } from '../hooks/useLogoutConfirm';
import { STATUS_COLORS, CHART_COLORS } from '../utils/constants';
import { fmt } from '../utils/dates';
import GlassSelect from '../components/GlassSelect';
import GlassDatePicker from '../components/GlassDatePicker';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'complaints', label: 'Complaints', icon: 'assignment' },
  { id: 'engineers', label: 'Engineers', icon: 'engineering' },
  { id: 'reports', label: 'Reports', icon: 'trending_up' },
];

const CHART_STATUS_COLORS = { open: '#1D4ED8', assigned: '#7C3AED', in_progress: '#B45309', resolved: '#1A7A4A', closed: '#64748B' };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="mgmt-chart-tooltip">
      <div className="mgmt-chart-tt-label">{label}</div>
      {payload.map((e, i) => (
        <div key={i} className="mgmt-chart-tt-row" style={{ color: e.color || e.fill }}>
          <span>{e.name}:</span> <strong>{e.value?.toLocaleString?.() ?? e.value}</strong>
        </div>
      ))}
    </div>
  );
}

function TimelineModal({ complaint, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (modalRef.current) modalRef.current.focus();
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!complaint) return null;
  const steps = [
    { key: 'created', label: 'Registered', time: complaint.createdAt, done: true },
    { key: 'assigned', label: 'Assigned', time: complaint.assignedAt, done: !!complaint.assignedTo },
    { key: 'in_progress', label: 'In Progress', time: getStatusTime(complaint, 'in_progress'), done: complaint.status === 'in_progress' || complaint.status === 'resolved' || complaint.status === 'closed' },
    { key: 'resolved', label: 'Resolved', time: complaint.resolvedAt, done: complaint.status === 'resolved' || complaint.status === 'closed' },
    { key: 'closed', label: 'Closed', time: complaint.closedAt, done: complaint.status === 'closed' },
  ];
  function getStatusTime(c, status) {
    const entry = c.activityLog?.find(a => a.action?.toLowerCase().includes(status.replace('_', ' ')));
    return entry?.timestamp || null;
  }
  return (
      <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} role="dialog" aria-modal="true" ref={modalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Timeline &mdash; {complaint.ticketId}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><MaterialIcon name="close" size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8 }}>
            <div className="text-sm text-muted">{complaint.district} &middot; {complaint.facilityName}</div>
            <div className="text-sm" style={{ marginTop: 4 }}>{complaint.issueCategory?.join(', ')}</div>
          </div>
          <div className="mgmt-timeline">
            {steps.map((s, i) => (
              <div key={s.key} className={`mgmt-timeline-item ${s.done ? 'done' : ''}`}>
                <div className="mgmt-timeline-dot-wrap">
                  <div className={`mgmt-timeline-dot ${s.done ? 'filled' : ''}`} />
                  {i < steps.length - 1 && <div className={`mgmt-timeline-line ${s.done ? 'filled' : ''}`} />}
                </div>
                <div className="mgmt-timeline-content">
                  <div className="mgmt-timeline-label">{s.label}</div>
                  <div className="mgmt-timeline-date">{s.time ? fmt(s.time) : s.done ? 'Completed' : 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
          {complaint.activityLog?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="font-semibold text-sm mb-2">Activity Log</div>
              {complaint.activityLog.slice().reverse().map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B', flexShrink: 0 }}>{fmt(a.timestamp)}</span>
                  <span><strong>{a.action}</strong> by {a.performedBy}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManagementDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { confirmLogout, LogoutConfirmModal } = useLogoutConfirm();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', district: '', facility: '', engineer: '',
    status: '', issueCategory: '', priority: '',
  });
  const [districtList, setDistrictList] = useState([]);
  const [engineerList, setEngineerList] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [complaintsTotal, setComplaintsTotal] = useState(0);
  const [complaintsPage, setComplaintsPage] = useState(1);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [timelineTarget, setTimelineTarget] = useState(null);
  const [reportType, setReportType] = useState('excel');

  useEffect(() => {
    if (!user || user.role !== 'management') {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role !== 'management') {
    return null;
  }

  useEffect(() => {
    getDistricts().then(r => setDistrictList(r.data)).catch(() => { toast.error('Failed to load data'); });
    getEngineers().then(r => setEngineerList(r.data)).catch(() => { toast.error('Failed to load data'); });
  }, []);

  const loadStats = useCallback(async (f) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await getManagementStats(params);
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') loadStats(filters);
  }, [activeTab, filters, loadStats]);

  const loadComplaints = useCallback(async (page, f, search) => {
    setComplaintsLoading(true);
    try {
      const params = { page, limit: 20 };
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      if (search) params.search = search;
      const res = await getManagementComplaints(params);
      setComplaints(res.data.complaints);
      setComplaintsTotal(res.data.total);
      setComplaintsPage(res.data.page);
    } catch (err) {
      setError('Failed to load complaints');
    } finally {
      setComplaintsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'complaints') loadComplaints(1, filters, searchQuery);
  }, [activeTab, filters, searchQuery, loadComplaints]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setTimelineTarget(null); };
    if (timelineTarget) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [timelineTarget]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleSort = (key) => {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };
  const sortedComplaints = useMemo(() => {
    if (!complaints.length) return [];
    const sorted = [...complaints];
    sorted.sort((a, b) => {
      let aVal = a[sort.key], bVal = b[sort.key];
      if (sort.key === 'createdAt' || sort.key === 'updatedAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = String(aVal ?? '').toLowerCase();
        bVal = String(bVal ?? '').toLowerCase();
      }
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [complaints, sort]);

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', district: '', facility: '', engineer: '', status: '', issueCategory: '', priority: '' });
    setSearchQuery('');
  };

  const statMap = useCallback((status) => {
    return stats?.statusStats?.find(s => s._id === status)?.count || 0;
  }, [stats]);

  const chartMonthly = useMemo(() => {
    if (!stats?.monthlyStats) return [];
    return stats.monthlyStats.map(m => {
      const [y, mo] = m.month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        name: `${monthNames[parseInt(mo) - 1]} ${y.slice(2)}`,
        Registered: m.registered,
        Resolved: m.resolved,
        Pending: Math.max(0, m.pending),
      };
    });
  }, [stats]);

  const districtChartData = useMemo(() => {
    if (!stats?.districtStats) return [];
    return stats.districtStats.slice(0, 15).map(d => ({
      name: d.district.length > 10 ? d.district.slice(0, 10) + '...' : d.district,
      fullName: d.district,
      Total: d.total,
      Resolved: d.resolved,
      Pending: d.pending,
    }));
  }, [stats]);

  const statusPieData = useMemo(() => {
    if (!stats?.statusStats) return [];
    return [
      { name: 'Open', value: statMap('open'), color: '#1D4ED8' },
      { name: 'Assigned', value: (stats.assignedCount || 0) - statMap('in_progress') > 0 ? Math.max(0, (stats.assignedCount || 0) - statMap('in_progress') - statMap('resolved') - statMap('closed')) : 0, color: '#7C3AED' },
      { name: 'In Progress', value: statMap('in_progress'), color: '#B45309' },
      { name: 'Resolved', value: statMap('resolved'), color: '#1A7A4A' },
      { name: 'Closed', value: statMap('closed'), color: '#64748B' },
    ].filter(d => d.value > 0);
  }, [stats, statMap]);

  const topEngineers = useMemo(() => {
    if (!stats?.engineerPerformance) return [];
    return stats.engineerPerformance.slice(0, 5);
  }, [stats]);

  const quickStats = useMemo(() => {
    if (!stats) return [];
    const today = new Date().toDateString();
    return [
      { label: 'Resolution Rate', value: stats.resolutionPct != null ? `${stats.resolutionPct}%` : '-', icon: 'gps_fixed', color: '#0F4C81' },
      { label: 'Avg Resolution Time', value: stats.avgResolutionDays != null ? `${stats.avgResolutionDays} days` : '-', icon: 'timer', color: '#1A6BB5' },
      { label: 'Oldest Pending', value: stats.oldestPending?.ticketId || '-', icon: 'calendar_month', color: '#E8741A', subtitle: stats.oldestPending ? `${stats.oldestPending.district} - ${fmt(stats.oldestPending.createdAt)}` : undefined },
      { label: 'Created Today', value: stats.createdTodayCount ?? '-', icon: 'fiber_new', color: '#1A7A4A' },
      { label: 'Resolved Today', value: stats.resolvedTodayCount ?? '-', icon: 'check_circle', color: '#059669' },
    ];
  }, [stats]);

  const exportReport = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      params.page = 1;
      params.limit = 5000;
      const res = await getManagementComplaints(params);
      const data = res.data.complaints;
      if (!data?.length) { setError('No data to export'); return; }

      let content, mime, ext;
      if (reportType === 'csv') {
        const headers = ['Ticket ID', 'District', 'Facility', 'Engineer', 'Type', 'Priority', 'Status', 'Created', 'Updated'];
        const rows = data.map(c => [
          c.ticketId, c.district, c.facilityName,
          c.assignedTo?.name || '-',
          (c.issueCategory || []).join('; '),
          c.priority, c.status,
          fmt(c.createdAt), fmt(c.updatedAt)
        ]);
        content = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        mime = 'text/csv';
        ext = 'csv';
      } else if (reportType === 'excel') {
        const headers = ['Ticket ID', 'District', 'Facility', 'Engineer', 'Type', 'Priority', 'Status', 'Created', 'Updated'];
        const rows = data.map(c => [c.ticketId, c.district, c.facilityName, c.assignedTo?.name || '-', (c.issueCategory || []).join('; '), c.priority, c.status, c.createdAt, c.updatedAt]);
        let xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Complaints"><Table>';
        xml += '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('') + '</Row>';
        rows.forEach(r => {
          xml += '<Row>' + r.map(v => `<Cell><Data ss:Type="${typeof v === 'number' ? 'Number' : 'String'}">${escapeXml(String(v ?? ''))}</Data></Cell>`).join('') + '</Row>';
        });
        xml += '</Table></Worksheet></Workbook>';
        content = xml;
        mime = 'application/vnd.ms-excel';
        ext = 'xls';
      } else if (reportType === 'pdf') {
        const win = window.open('', '_blank');
        if (!win) { toast.error('Popup blocked. Please allow popups for this site.'); return; }
        win.document.write(`<html><head><title>Complaint Report</title>
<style>body{font-family:Arial,sans-serif;margin:24px;font-size:12px}
h2{color:#0F4C81;margin-bottom:4px}
.sub{color:#666;font-size:13px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th{background:#0F4C81;color:#fff;padding:8px 6px;text-align:left;font-size:11px}
td{padding:6px;border-bottom:1px solid #ddd;font-size:11px}
.footer{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
</style></head><body>
<h2>Digital Sanchar Sathi — Complaint Report</h2>
<div class="sub">Generated: ${new Date().toLocaleString('en-IN')} | ${data.length} complaints</div>
<table><thead><tr><th>Ticket ID</th><th>District</th><th>Facility</th><th>Engineer</th><th>Type</th><th>Priority</th><th>Status</th><th>Created</th><th>Updated</th></tr></thead><tbody>
${data.map(c => `<tr><td>${escapeHtml(c.ticketId)}</td><td>${escapeHtml(c.district)}</td><td>${escapeHtml(c.facilityName)}</td><td>${escapeHtml(c.assignedTo?.name || '-')}</td><td>${escapeHtml((c.issueCategory || []).join('; '))}</td><td>${escapeHtml(c.priority)}</td><td>${escapeHtml(c.status)}</td><td>${escapeHtml(fmt(c.createdAt))}</td><td>${escapeHtml(fmt(c.updatedAt))}</td></tr>`).join('')}
</tbody></table>
<div class="footer">Digital Sanchar Sathi — Jharkhand Health WiFi Complaint Management System</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
        win.document.close();
        return;
      } else {
        const headers = ['Ticket ID', 'District', 'Facility', 'Engineer', 'Type', 'Priority', 'Status', 'Created', 'Updated'];
        const rows = data.map(c => ({
          ticketId: c.ticketId, district: c.district, facility: c.facilityName,
          engineer: c.assignedTo?.name || '-', type: (c.issueCategory || []).join('; '),
          priority: c.priority, status: c.status,
          created: c.createdAt, updated: c.updatedAt
        }));
        content = JSON.stringify({ generatedAt: new Date().toISOString(), total: data.length, headers, data: rows }, null, 2);
        mime = 'application/json';
        ext = 'json';
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complaint-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed');
    }
  };

  const sidebarLink = (n) => (
    <div key={n.id} className={`sidebar-link material-nav-item ${activeTab === n.id ? 'active' : ''}`}
      role="link" tabIndex={0}
      onClick={() => { setActiveTab(n.id); setSidebarOpen(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(n.id); setSidebarOpen(false); } }}>
      <span><MaterialIcon name={n.icon} size={20} /></span>{n.label}
    </div>
  );

  if (loading && !stats) {
    return (
      <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        <div className="mgmt-quick-stats" style={{ marginBottom: 20 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skel skel-kpi" />)}
        </div>
        <div className="mgmt-kpi-grid" style={{ marginBottom: 20 }}>
          {[...Array(12)].map((_, i) => <div key={i} className="skel skel-card" />)}
        </div>
        <div className="mgmt-charts-grid">
          <div className="skel skel-chart" />
          <div className="skel skel-chart" />
        </div>
      </div>
    );
  }

  return (
    <div className="mgmt-dashboard">
      {/* Navbar */}
      <nav className="navbar glass-navbar">
        <div className="navbar-inner navbar-inner-split">
          <div className="navbar-logo-slot navbar-logo-slot--left navbar-admin-left">
            <button type="button" className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><MaterialIcon name="menu" size={24} /></button>
            <img src="/logos/abdm.png" alt="ABDM" className="navbar-logo-img" />
          </div>
          <div className="navbar-brand-center">
            <span className="navbar-title">डिजिटल संचार साथी</span>
            <span className="navbar-subtitle">Management Console</span>
          </div>
          <div className="navbar-logo-slot navbar-logo-slot--right">
            <img src="/logos/bsnl.png" alt="BSNL" className="navbar-logo-img" />
            <div className="navbar-actions navbar-actions--compact">
              <span className="navbar-user navbar-user--compact">{user?.name}</span>
              <span className="navbar-role navbar-role--compact">Management</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden={!sidebarOpen} />
      <aside className={`sidebar-mobile ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-semibold">Menu</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(false)}><MaterialIcon name="close" size={20} /></button>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          {NAV.map(sidebarLink)}
        </div>
        <div className="sidebar-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--gray-100)' }}>
          <div className="sidebar-link" role="link" tabIndex={0} onClick={() => { window.open('/', '_blank'); setSidebarOpen(false); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open('/', '_blank'); setSidebarOpen(false); } }}>
            <span><MaterialIcon name="home" size={20} /></span>Public Portal
          </div>
          <div className="sidebar-link" role="link" tabIndex={0}
            onClick={toggleTheme}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); } }}>
            <span><MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} /></span> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </div>
          <div className="sidebar-link" role="link" tabIndex={0} onClick={() => { confirmLogout(); setSidebarOpen(false); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmLogout(); setSidebarOpen(false); } }}>
            <span><MaterialIcon name="logout" size={20} /></span>Logout
          </div>
        </div>
      </aside>

      <div className="dashboard-layout">
        {/* Desktop sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Navigation</div>
            {NAV.map(sidebarLink)}
          </div>
          <div className="sidebar-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--gray-100)' }}>
            <div className="sidebar-link" role="link" tabIndex={0} onClick={() => window.open('/', '_blank')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open('/', '_blank'); } }}>
              <span><MaterialIcon name="home" size={20} /></span>Public Portal
            </div>
            <div className="sidebar-link" role="link" tabIndex={0}
              onClick={toggleTheme}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); } }}>
              <span><MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} /></span> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </div>
            <div className="sidebar-link" role="link" tabIndex={0} onClick={confirmLogout} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmLogout(); } }}>
              <span><MaterialIcon name="logout" size={20} /></span>Logout
            </div>
          </div>
        </aside>

        <main className="main-content">
          {error && <div className="alert alert-error mb-3" onClick={() => setError('')}>{error} <span style={{ marginLeft: 'auto', cursor: 'pointer' }}><MaterialIcon name="close" size={14} /></span></div>}

          {/* === DASHBOARD TAB === */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Management Dashboard</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real-time overview of the complaint management system</p>
              </div>

              {/* Quick Stats row */}
              <div className="responsive-kpi-grid stagger-children" style={{ marginBottom: 24 }}>
                {quickStats.map((qs, i) => (
                  <div key={i} className="mgmt-kpi-card material-kpi" style={{ flexDirection: 'column', textAlign: 'center', borderTop: `3px solid ${qs.color}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: qs.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '1.2rem' }}><MaterialIcon name={qs.icon} size={24} /></div>
                    <div className="mgmt-kpi-value" style={{ color: qs.color, fontSize: '1.3rem' }}>{qs.value}</div>
                    <div className="mgmt-kpi-label">{qs.label}</div>
                    {qs.subtitle && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{qs.subtitle}</div>}
                  </div>
                ))}
              </div>

              {/* KPI Cards */}
              <div className="responsive-card-grid-sm" style={{ marginBottom: 24 }}>
                {[
                  { icon: 'assignment', value: stats?.total || 0, label: 'Total Complaints', sub: 'All time', color: '#0F4C81', status: '' },
                  { icon: 'radio_button_checked', value: statMap('open'), label: 'Open', sub: 'Awaiting assignment', color: '#1D4ED8', status: 'open' },
                  { icon: 'attach_file', value: stats?.assignedCount || 0, label: 'Assigned', sub: 'To engineers', color: '#7C3AED', status: '' },
                  { icon: 'pending', value: statMap('in_progress'), label: 'In Progress', sub: 'Being resolved', color: '#B45309', status: 'in_progress' },
                  { icon: 'check_circle', value: statMap('resolved'), label: 'Resolved', sub: 'Completed', color: '#1A7A4A', status: 'resolved' },
                  { icon: 'inventory_2', value: statMap('closed'), label: 'Closed', sub: 'Ticket closed', color: '#64748B', status: 'closed' },
                  { icon: 'hourglass_empty', value: stats?.pendingCount ?? 0, label: 'Pending', sub: 'Open + In Progress', color: '#E8741A', status: '' },
                  { icon: 'assessment', value: stats?.resolutionPct != null ? `${stats.resolutionPct}%` : '-', label: 'Resolution Rate', sub: 'Resolved + Closed / Total', color: '#059669', status: '' },
                  { icon: 'timer', value: stats?.avgResolutionDays != null ? `${stats.avgResolutionDays}d` : '-', label: 'Avg Resolution', sub: 'Per complaint', color: '#0EA5E9', status: '' },
                  { icon: 'engineering', value: stats?.activeEngineerCount || 0, label: 'Active Engineers', sub: `${stats?.engineerCount || 0} total`, color: '#8B5CF6', status: '' },
                  { icon: 'location_city', value: stats?.districtsCovered ?? 0, label: 'Districts Covered', sub: 'With complaints', color: '#14B8A6', status: '' },
                  { icon: 'fiber_new', value: stats?.createdTodayCount ?? 0, label: 'Created Today', sub: 'Past 24 hours', color: '#EC4899', status: '' },
                ].map((item, i) => (
                  <div key={i} className="card hover-lift material-kpi" style={{ padding: '14px 12px', textAlign: 'center', borderTop: `3px solid ${item.color}`, cursor: item.status ? 'pointer' : 'default' }}
                    onClick={item.status ? () => { setFilters(f => ({ ...f, status: item.status })); setActiveTab('complaints'); } : undefined}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '1.1rem' }}><MaterialIcon name={item.icon} size={22} /></div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filters</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[
                      { val: '', label: 'All' },
                      { val: 'open', label: 'Open' },
                      { val: 'in_progress', label: 'Active' },
                      { val: 'resolved', label: 'Done' },
                      { val: 'closed', label: 'Closed' },
                    ].map(({ val, label }) => (
                      <button key={val} type="button"
                        className={`btn btn-sm ${filters.status === val ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '5px 14px', fontSize: '0.78rem', borderRadius: 6 }}
                        onClick={() => handleFilterChange('status', val)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, alignItems: 'end' }}>
                  <div className="material-date-wrap">
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>Start Date</label>
                    <GlassDatePicker value={filters.startDate} onChange={v => handleFilterChange('startDate', v)} style={{ fontSize: '0.8rem' }} />
                  </div>
                  <div className="material-date-wrap">
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>End Date</label>
                    <GlassDatePicker value={filters.endDate} onChange={v => handleFilterChange('endDate', v)} style={{ fontSize: '0.8rem' }} />
                  </div>
                  <div className="material-select-wrap">
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>District</label>
                    <GlassSelect value={filters.district} onChange={v => handleFilterChange('district', v)} options={districtList.map(d => ({ value: d, label: d }))} placeholder="All" style={{ fontSize: '0.8rem' }} />
                  </div>
                  <div className="material-select-wrap">
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>Priority</label>
                    <GlassSelect value={filters.priority} onChange={v => handleFilterChange('priority', v)} options={[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'},{value:'critical',label:'Critical'}]} placeholder="All" style={{ fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ fontSize: '0.78rem', borderRadius: 6 }}>Clear Filters</button>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="responsive-grid-2-1" style={{ marginBottom: 24 }}>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Complaint Status</h3>
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                          {statusPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                          formatter={v => <span className="mgmt-legend-text">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}><MaterialIcon name="assessment" size={32} /></div>
                      <div style={{ fontSize: '0.85rem' }}>No data available yet</div>
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Monthly Trend</h3>
                  {chartMonthly.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={chartMonthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0F4C81" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#0F4C81" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1A7A4A" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#1A7A4A" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" iconSize={8}
                          formatter={v => <span className="mgmt-legend-text">{v}</span>} />
                        <Area type="monotone" dataKey="Registered" stroke="#0F4C81" strokeWidth={2} fill="url(#regGrad)" dot={{ r: 3, fill: '#0F4C81' }} activeDot={{ r: 5 }} />
                        <Area type="monotone" dataKey="Resolved" stroke="#1A7A4A" strokeWidth={2} fill="url(#resGrad)" dot={{ r: 3, fill: '#1A7A4A' }} activeDot={{ r: 5 }} />
                        <Area type="monotone" dataKey="Pending" stroke="#E8741A" strokeWidth={2} fill="none" dot={{ r: 3, fill: '#E8741A' }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}><MaterialIcon name="assessment" size={32} /></div>
                      <div style={{ fontSize: '0.85rem' }}>No monthly data yet</div>
                    </div>
                  )}
                </div>
              </div>

              {/* District & Engineer Section */}
              <div className="responsive-grid-1-2" style={{ marginBottom: 24 }}>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)', fontWeight: 600 }}>District-wise Analysis</h3>
                  {districtChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={districtChartData} margin={{ top: 8, right: 8, left: -16, bottom: 40 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={90} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" iconSize={8}
                          formatter={v => <span className="mgmt-legend-text">{v}</span>} />
                        <Bar dataKey="Total" fill="#0F4C81" radius={[0, 3, 3, 0]} />
                        <Bar dataKey="Resolved" fill="#1A7A4A" radius={[0, 3, 3, 0]} />
                        <Bar dataKey="Pending" fill="#E8741A" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}><MaterialIcon name="location_city" size={32} /></div>
                      <div style={{ fontSize: '0.85rem' }}>No district data yet</div>
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Top 5 Engineers</h3>
                  {topEngineers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {topEngineers.map((eng, i) => {
                        const avatarColors = ['#0F4C81', '#1A6BB5', '#E8741A', '#7C3AED', '#059669'];
                        const initials = (eng.name || 'E').charAt(0).toUpperCase();
                        return (
                        <div key={eng.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary, #f8fafc)', transition: 'transform 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#E2E8F0', color: i < 3 ? '#1E293B' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: avatarColors[i % avatarColors.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{eng.name}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              <span><strong style={{ color: '#1A7A4A' }}>{eng.resolvedCount}</strong> resolved</span>
                              <span><strong style={{ color: '#B45309' }}>{eng.pendingCount}</strong> pending</span>
                              <span><strong>{eng.resolutionPct}%</strong> rate</span>
                            </div>
                          </div>
                          <div style={{ width: 60 }}>
                            <div style={{ height: 5, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${eng.resolutionPct}%`, height: '100%', background: i === 0 ? '#0F4C81' : i === 1 ? '#1A6BB5' : i === 2 ? '#2E7DBA' : '#94A3B8', borderRadius: 3 }} />
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}><MaterialIcon name="engineering" size={32} /></div>
                      <div style={{ fontSize: '0.85rem' }}>No engineers with data</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === COMPLAINTS TAB === */}
          {activeTab === 'complaints' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>All Complaints</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>View-only complaint list &mdash; {complaintsTotal} total</p>
              </div>

              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[
                      { val: '', label: 'All' },
                      { val: 'open', label: 'Open' },
                      { val: 'in_progress', label: 'Active' },
                      { val: 'resolved', label: 'Done' },
                      { val: 'closed', label: 'Closed' },
                    ].map(({ val, label }) => (
                      <button key={val} type="button"
                        className={`btn btn-sm ${filters.status === val ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '5px 14px', fontSize: '0.78rem', borderRadius: 6 }}
                        onClick={() => handleFilterChange('status', val)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input type="text" className="form-control" placeholder="Search ticket ID, district, facility..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: '1 1 200px', fontSize: '0.85rem' }} />
                  <GlassSelect value={filters.district} onChange={v => handleFilterChange('district', v)} options={districtList.map(d => ({ value: d, label: d }))} placeholder="All Districts" style={{ flex: '1 1 130px', fontSize: '0.85rem' }} />
                  <GlassSelect value={filters.priority} onChange={v => handleFilterChange('priority', v)} options={[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'},{value:'critical',label:'Critical'}]} placeholder="All Priority" style={{ flex: '1 1 130px', fontSize: '0.85rem' }} />
                  <GlassSelect value={filters.engineer} onChange={v => handleFilterChange('engineer', v)} options={engineerList.map(eng => ({ value: eng._id, label: eng.name }))} placeholder="All Engineers" style={{ flex: '1 1 130px', fontSize: '0.85rem' }} />
                  <div className="material-date-wrap">
                    <GlassDatePicker value={filters.startDate} onChange={v => handleFilterChange('startDate', v)} style={{ flex: '1 1 120px', fontSize: '0.85rem' }} />
                  </div>
                  <div className="material-date-wrap">
                    <GlassDatePicker value={filters.endDate} onChange={v => handleFilterChange('endDate', v)} style={{ flex: '1 1 120px', fontSize: '0.85rem' }} />
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ fontSize: '0.78rem' }}>Clear</button>
                </div>
              </div>

              {complaintsLoading ? (
                <SkeletonTable />
              ) : (
                <>
                  {/* Mobile Card View */}
                  {sortedComplaints.length === 0 ? (
                    <div className="mobile-complaint-card" style={{ padding: '48px 24px' }}>
                      <EmptyState
                        icon="inbox"
                        title="No complaints found"
                        description="No complaints match the current filters. Try adjusting your search criteria."
                      />
                    </div>
                  ) : (
                    sortedComplaints.map(c => (
                      <div key={c._id} className="mobile-complaint-card" style={{ margin: '12px 16px' }}>
                        <div className="mobile-complaint-header">
                          <span className="mobile-complaint-ticket">{c.ticketId}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <div className="mobile-complaint-meta">
                          <div className="mobile-complaint-meta-item">
                            <span className="mobile-complaint-meta-label">Complainant</span>
                            <span className="mobile-complaint-meta-value">{c.userName}</span>
                          </div>
                          <div className="mobile-complaint-meta-item">
                            <span className="mobile-complaint-meta-label">District</span>
                            <span className="mobile-complaint-meta-value">{c.district}</span>
                          </div>
                          <div className="mobile-complaint-meta-item">
                            <span className="mobile-complaint-meta-label">Facility</span>
                            <span className="mobile-complaint-meta-value">{c.facilityName}</span>
                          </div>
                          <div className="mobile-complaint-meta-item">
                            <span className="mobile-complaint-meta-label">Priority</span>
                            <span className="mobile-complaint-meta-value"><span className={`badge badge-${c.priority}`}>{c.priority}</span></span>
                          </div>
                        </div>
                        <div className="mobile-complaint-footer">
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(c.createdAt)}</span>
                          <div className="mobile-complaint-actions">
                            <StatusBadge status={c.status} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Desktop Table View */}
                  <div className="table-wrapper">
                    <table className="mgmt-table material-table">
                      <thead>
                        <tr>
                          <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('ticketId')}>Ticket{sort.key === 'ticketId' ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                          <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('district')}>District{sort.key === 'district' ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                          <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('facilityName')}>Facility{sort.key === 'facilityName' ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                          <th>Engineer</th>
                          <th>Type</th>
                          <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('priority')}>Priority{sort.key === 'priority' ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                          <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('status')}>Status{sort.key === 'status' ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                          <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('createdAt')}>Created{sort.key === 'createdAt' ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                          <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('updatedAt')}>Updated{sort.key === 'updatedAt' ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedComplaints.map(c => (
                          <tr key={c._id}>
                            <td className="font-semibold" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.ticketId}</td>
                            <td>{c.district}</td>
                            <td>{c.facilityName}</td>
                            <td>{c.assignedTo?.name || <span className="text-muted">-</span>}</td>
                            <td style={{ maxWidth: 160, fontSize: '0.8rem' }}>{(c.issueCategory || []).join(', ')}</td>
                            <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                            <td><StatusBadge status={c.status} /></td>
                            <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmt(c.createdAt)}</td>
                            <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmt(c.updatedAt)}</td>
                            <td>
                              <button className="btn btn-ghost btn-sm" title="View Timeline"
                                onClick={() => setTimelineTarget(c)} style={{ fontSize: '0.85rem' }}>
                                <MaterialIcon name="timeline" size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm text-muted">Page {complaintsPage}</span>
                    <div className="flex gap-2">
                      <button className="btn btn-outline btn-sm" disabled={complaintsPage <= 1}
                        onClick={() => loadComplaints(complaintsPage - 1, filters, searchQuery)}>← Prev</button>
                      <button className="btn btn-outline btn-sm" disabled={complaintsPage * 20 >= complaintsTotal}
                        onClick={() => loadComplaints(complaintsPage + 1, filters, searchQuery)}>Next →</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* === ENGINEERS TAB === */}
          {activeTab === 'engineers' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Engineer Performance</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>All engineers</p>
              </div>

              {stats?.engineerPerformance?.length > 0 ? (
                <div className="responsive-card-grid">
                  {stats.engineerPerformance.map((eng, i) => {
                    const avatarColors = ['#0F4C81', '#1A6BB5', '#E8741A', '#7C3AED', '#059669'];
                    return (
                    <div key={eng.email} className="card hover-lift glass-card" style={{ padding: 20, borderTop: `3px solid ${avatarColors[i % avatarColors.length]}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: avatarColors[i % avatarColors.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                            {(eng.name || 'E').charAt(0).toUpperCase()}
                          </div>
                          {i < 3 && <div style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: ['#FFD700', '#C0C0C0', '#CD7F32'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: i === 0 ? '#1E293B' : '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>#{i + 1}</div>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{eng.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg: {eng.avgResolutionDays != null ? `${eng.avgResolutionDays}d` : '-'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                        <div style={{ padding: '8px 0', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#0F4C81', fontSize: '1.1rem' }}>{eng.totalAssigned}</div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Assigned</div></div>
                        <div style={{ padding: '8px 0', background: '#f0fdf4', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#1A7A4A', fontSize: '1.1rem' }}>{eng.resolvedCount}</div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Resolved</div></div>
                        <div style={{ padding: '8px 0', background: '#fff7ed', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#B45309', fontSize: '1.1rem' }}>{eng.pendingCount}</div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Pending</div></div>
                        <div style={{ padding: '8px 0', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8 }}><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{eng.resolutionPct}%</div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Rate</div></div>
                      </div>
                      <div style={{ marginTop: 14, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${eng.resolutionPct}%`, height: '100%', background: eng.resolutionPct >= 70 ? '#1A7A4A' : eng.resolutionPct >= 40 ? '#B45309' : '#E8741A', borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                  <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}><MaterialIcon name="engineering" size={32} /></div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No engineer data available</div>
                </div>
              )}
            </div>
          )}

          {/* === REPORTS TAB === */}
          {activeTab === 'reports' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Reports</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Export complaint data with current filters</p>
              </div>

              <div className="card" style={{ maxWidth: 600, padding: 24 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 16, fontWeight: 600 }}>Export Complaints</h3>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Export Format</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      { val: 'excel', label: 'Excel', icon: 'table_chart', color: '#22c55e' },
                      { val: 'pdf', label: 'PDF', icon: 'feed', color: '#ef4444' },
                      { val: 'json', label: 'JSON', icon: 'code', color: '#8b5cf6' },
                    ].map(({ val, label, icon, color }) => (
                      <button key={val} type="button"
                        className="material-export-card"
                        onClick={() => setReportType(val)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 20px', borderRadius: 10, border: `2px solid ${reportType === val ? color : 'var(--border-color)'}`, background: reportType === val ? color + '10' : 'transparent', cursor: 'pointer', transition: 'all 0.2s', minWidth: 90 }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = color}
                        onMouseLeave={e => { if (reportType !== val) e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                        <span style={{ fontSize: '1.3rem' }}><MaterialIcon name={icon} size={24} /></span>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: reportType === val ? color : 'var(--text-primary)' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Filter Context</label>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8, lineHeight: 1.6 }}>
                    {filters.district && <span style={{ display: 'inline-block', background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>District: {filters.district}</span>}
                    {filters.status && <span style={{ display: 'inline-block', background: '#f0fdf4', color: '#1A7A4A', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>Status: {filters.status}</span>}
                    {filters.priority && <span style={{ display: 'inline-block', background: '#fff7ed', color: '#E8741A', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>Priority: {filters.priority}</span>}
                    {filters.startDate && <span style={{ display: 'inline-block', background: '#f5f3ff', color: '#7C3AED', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>From: {filters.startDate}</span>}
                    {filters.endDate && <span style={{ display: 'inline-block', background: '#fdf2f8', color: '#EC4899', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>To: {filters.endDate}</span>}
                    {!filters.district && !filters.status && !filters.priority && !filters.startDate && !filters.endDate && <span style={{ color: 'var(--text-muted)' }}>All complaints (no active filters)</span>}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={exportReport} style={{ padding: '10px 24px', borderRadius: 8 }}>
                  <MaterialIcon name="download" size={18} /> Export {reportType.toUpperCase()} Report
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Timeline Modal */}
      {timelineTarget && <TimelineModal complaint={timelineTarget} onClose={() => setTimelineTarget(null)} />}

      {LogoutConfirmModal}
    </div>
  );
}
