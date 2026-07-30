import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { getManagementStats, getManagementComplaints, getDistricts, getEngineers } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import useTheme from '../hooks/useTheme';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'complaints', label: 'Complaints', icon: '📋' },
  { id: 'engineers', label: 'Engineers', icon: '👷' },
  { id: 'reports', label: 'Reports', icon: '📈' },
];

const STATUS_COLORS = {
  open: '#1D4ED8',
  in_progress: '#B45309',
  resolved: '#1A7A4A',
  closed: '#64748B',
};
const CHART_COLORS = ['#0F4C81', '#1A6BB5', '#E8741A', '#1A7A4A', '#B45309', '#64748B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const CHART_STATUS_COLORS = { open: '#1D4ED8', assigned: '#7C3AED', in_progress: '#B45309', resolved: '#1A7A4A', closed: '#64748B' };

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatCard({ icon, value, label, subtitle, color, trend, onClick }) {
  return (
    <div className={`card mgmt-stat-card ${onClick ? 'mgmt-stat-card--clickable' : ''}`}
      style={{ borderLeft: `4px solid ${color}`, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}>
      <div className="mgmt-stat-inner">
        <div className="mgmt-stat-left">
          <div className="mgmt-stat-label">{label}</div>
          <div className="mgmt-stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          {subtitle && <div className="mgmt-stat-sub">{subtitle}</div>}
        </div>
        <div className="mgmt-stat-icon-wrap" style={{ background: color + '15', color }}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mgmt-stat-trend" style={{ color: trend >= 0 ? '#1A7A4A' : '#B91C1C' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children, action, className = '' }) {
  return (
    <div className={`card mgmt-chart-card ${className}`}>
      <div className="card-header">
        <div>
          <div className="card-title" style={{ fontSize: '0.95rem' }}>{title}</div>
          {subtitle && <div className="text-xs text-muted mt-1">{subtitle}</div>}
        </div>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

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

function KpiCard({ label, value, icon, color, suffix }) {
  return (
    <div className="mgmt-kpi-card">
      <div className="mgmt-kpi-icon" style={{ background: color + '18', color }}>{icon}</div>
      <div className="mgmt-kpi-body">
        <div className="mgmt-kpi-value">{value ?? '-'}</div>
        <div className="mgmt-kpi-label">{label}</div>
      </div>
    </div>
  );
}

function TimelineModal({ complaint, onClose }) {
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
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Timeline &mdash; {complaint.ticketId}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
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
                  <div className="mgmt-timeline-date">{s.time ? formatDate(s.time) : s.done ? 'Completed' : 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
          {complaint.activityLog?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="font-semibold text-sm mb-2">Activity Log</div>
              {complaint.activityLog.slice().reverse().map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B', flexShrink: 0 }}>{formatDate(a.timestamp)}</span>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', district: '', facility: '', engineer: '',
    status: '', issueCategory: '', priority: '',
  });
  const [districtList, setDistrictList] = useState([]);
  const [engineerList, setEngineerList] = useState([]);

  // Complaints tab
  const [complaints, setComplaints] = useState([]);
  const [complaintsTotal, setComplaintsTotal] = useState(0);
  const [complaintsPage, setComplaintsPage] = useState(1);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [timelineTarget, setTimelineTarget] = useState(null);

  // Reports
  const [reportType, setReportType] = useState('excel');

  useEffect(() => {
    getDistricts().then(r => setDistrictList(r.data)).catch(() => {});
    getEngineers().then(r => setEngineerList(r.data)).catch(() => {});
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
      { label: 'Resolution Rate', value: stats.resolutionPct != null ? `${stats.resolutionPct}%` : '-', icon: '🎯', color: '#0F4C81' },
      { label: 'Avg Resolution Time', value: stats.avgResolutionDays != null ? `${stats.avgResolutionDays} days` : '-', icon: '⏱️', color: '#1A6BB5' },
      { label: 'Oldest Pending', value: stats.oldestPending?.ticketId || '-', icon: '📅', color: '#E8741A', subtitle: stats.oldestPending ? `${stats.oldestPending.district} - ${formatDate(stats.oldestPending.createdAt)}` : undefined },
      { label: 'Created Today', value: stats.createdTodayCount ?? '-', icon: '🆕', color: '#1A7A4A' },
      { label: 'Resolved Today', value: stats.resolvedTodayCount ?? '-', icon: '✅', color: '#059669' },
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
          formatDate(c.createdAt), formatDate(c.updatedAt)
        ]);
        content = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        mime = 'text/csv';
        ext = 'csv';
      } else if (reportType === 'excel') {
        const headers = ['Ticket ID', 'District', 'Facility', 'Engineer', 'Type', 'Priority', 'Status', 'Created', 'Updated'];
        const rows = data.map(c => [c.ticketId, c.district, c.facilityName, c.assignedTo?.name || '-', (c.issueCategory || []).join('; '), c.priority, c.status, c.createdAt, c.updatedAt]);
        let xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Complaints"><Table>';
        xml += '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>';
        rows.forEach(r => {
          xml += '<Row>' + r.map(v => `<Cell><Data ss:Type="${typeof v === 'number' ? 'Number' : 'String'}">${String(v ?? '')}</Data></Cell>`).join('') + '</Row>';
        });
        xml += '</Table></Worksheet></Workbook>';
        content = xml;
        mime = 'application/vnd.ms-excel';
        ext = 'xls';
      } else if (reportType === 'pdf') {
        const win = window.open('', '_blank');
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
${data.map(c => `<tr><td>${c.ticketId}</td><td>${c.district}</td><td>${c.facilityName}</td><td>${c.assignedTo?.name || '-'}</td><td>${(c.issueCategory || []).join('; ')}</td><td>${c.priority}</td><td>${c.status}</td><td>${formatDate(c.createdAt)}</td><td>${formatDate(c.updatedAt)}</td></tr>`).join('')}
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
    <div key={n.id} className={`sidebar-link ${activeTab === n.id ? 'active' : ''}`}
      onClick={() => { setActiveTab(n.id); setSidebarOpen(false); }}>
      <span>{n.icon}</span>{n.label}
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
      <nav className="navbar">
        <div className="navbar-inner navbar-inner-split">
          <div className="navbar-logo-slot navbar-logo-slot--left navbar-admin-left">
            <button type="button" className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
            <img src="/logos/abdm.png" alt="ABDM" className="navbar-logo-img" />
          </div>
          <div className="navbar-brand-center">
            <span className="navbar-title">डिजिटल संचार साथी</span>
            <span className="navbar-subtitle">Management Console</span>
          </div>
          <div className="navbar-logo-slot navbar-logo-slot--right">
            <button type="button" className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀️' : '🌙'}</button>
            <img src="/logos/bsnl.png" alt="BSNL" className="navbar-logo-img" />
            <div className="navbar-actions navbar-actions--compact">
              <span className="navbar-user navbar-user--compact">{user?.name}</span>
              <span className="mgmt-role-badge" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>View Only</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Public Portal</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { logoutUser(); navigate('/login'); }} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Logout</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar-mobile ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-semibold">Menu</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          {NAV.map(sidebarLink)}
        </div>
        <div className="sidebar-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--gray-100)' }}>
          <div className="sidebar-link" onClick={() => { navigate('/'); setSidebarOpen(false); }}>
            <span>🏠</span>Public Portal
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
            <div className="sidebar-link" onClick={() => navigate('/')}>
              <span>🏠</span>Public Portal
            </div>
          </div>
        </aside>

        <main className="main-content">
          {error && <div className="alert alert-error mb-3" onClick={() => setError('')}>{error} <span style={{ marginLeft: 'auto', cursor: 'pointer' }}>✕</span></div>}

          {/* === DASHBOARD TAB === */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 className="mb-1">Management Dashboard</h2>
                  <p className="text-sm text-muted">Real-time overview of the complaint management system (read-only)</p>
                </div>
                <span className="badge mgmt-role-badge" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>🔍 View-Only Access</span>
              </div>

              {/* Quick Stats row */}
              <div className="mgmt-quick-stats">
                {quickStats.map((qs, i) => (
                  <KpiCard key={i} label={qs.label} value={qs.value} icon={qs.icon} color={qs.color} />
                ))}
              </div>

              {/* KPI Cards */}
              <div className="mgmt-kpi-grid">
                <StatCard icon="📋" value={stats?.total || 0} label="Total Complaints" subtitle="All time" color="#0F4C81" onClick={() => { setFilters(f => ({ ...f, status: '' })); setActiveTab('complaints'); }} />
                <StatCard icon="🔵" value={statMap('open')} label="Open" subtitle="Awaiting assignment" color="#1D4ED8" onClick={() => { setFilters(f => ({ ...f, status: 'open' })); setActiveTab('complaints'); }} />
                <StatCard icon="📎" value={stats?.assignedCount || 0} label="Assigned" subtitle="To engineers" color="#7C3AED" />
                <StatCard icon="🟡" value={statMap('in_progress')} label="In Progress" subtitle="Being resolved" color="#B45309" onClick={() => { setFilters(f => ({ ...f, status: 'in_progress' })); setActiveTab('complaints'); }} />
                <StatCard icon="✅" value={statMap('resolved')} label="Resolved" subtitle="Completed" color="#1A7A4A" onClick={() => { setFilters(f => ({ ...f, status: 'resolved' })); setActiveTab('complaints'); }} />
                <StatCard icon="📦" value={statMap('closed')} label="Closed" subtitle="Ticket closed" color="#64748B" onClick={() => { setFilters(f => ({ ...f, status: 'closed' })); setActiveTab('complaints'); }} />
                <StatCard icon="⏳" value={stats?.pendingCount ?? 0} label="Pending" subtitle="Open + In Progress" color="#E8741A" />
                <StatCard icon="📊" value={stats?.resolutionPct != null ? `${stats.resolutionPct}%` : '-'} label="Resolution Rate" subtitle="Resolved + Closed / Total" color="#059669" />
                <StatCard icon="⏱️" value={stats?.avgResolutionDays != null ? `${stats.avgResolutionDays}d` : '-'} label="Avg Resolution" subtitle="Per complaint" color="#0EA5E9" />
                <StatCard icon="👷" value={stats?.activeEngineerCount || 0} label="Active Engineers" subtitle={`${stats?.engineerCount || 0} total`} color="#8B5CF6" />
                <StatCard icon="🏘️" value={stats?.districtsCovered ?? 0} label="Districts Covered" subtitle="With complaints" color="#14B8A6" />
                <StatCard icon="🆕" value={stats?.createdTodayCount ?? 0} label="Created Today" subtitle="Past 24 hours" color="#EC4899" />
              </div>

              {/* Filters */}
              <div className="mgmt-filter-bar" style={{ padding: '12px 20px' }}>
                <div className="mgmt-filter-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ flex: 'none', minWidth: 0 }}>
                    <label className="form-label">Status</label>
                    <div className="mgmt-filter-chips" style={{ gap: 3 }}>
                      {[
                        { val: '', label: 'All' },
                        { val: 'open', label: 'Open' },
                        { val: 'in_progress', label: 'Active' },
                        { val: 'resolved', label: 'Done' },
                        { val: 'closed', label: 'Closed' },
                      ].map(({ val, label }) => (
                        <button key={val} type="button"
                          className={`btn btn-sm ${filters.status === val ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: 32 }}
                          onClick={() => handleFilterChange('status', val)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mgmt-filter-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-control" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-control" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">District</label>
                    <select className="form-control" value={filters.district} onChange={e => handleFilterChange('district', e.target.value)}>
                      <option value="">All</option>
                      {districtList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={filters.priority} onChange={e => handleFilterChange('priority', e.target.value)}>
                      <option value="">All</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="mgmt-filter-clear">
                    <label className="form-label">&nbsp;</label>
                    <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear Filters</button>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="mgmt-charts-grid">
                <ChartCard title="Complaint Status" subtitle="Current distribution">
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                          {statusPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                          formatter={v => <span className="mgmt-legend-text">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state" style={{ padding: '40px 24px' }}>
                      <div className="empty-title" style={{ fontSize: '0.9rem', color: 'var(--gray-400)' }}>📊 No data available yet</div>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Monthly Trend" subtitle="Registered vs Resolved (last 12 months)">
                  {chartMonthly.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
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
                    <div className="empty-state" style={{ padding: '40px 24px' }}>
                      <div className="empty-title" style={{ fontSize: '0.9rem', color: 'var(--gray-400)' }}>📊 No monthly data yet</div>
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* District & Engineer Section */}
              <div className="mgmt-charts-grid">
                <ChartCard title="District-wise Analysis" subtitle="Top 15 districts">
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
                    <div className="empty-state" style={{ padding: '40px 24px' }}>
                      <div className="empty-title" style={{ fontSize: '0.9rem', color: 'var(--gray-400)' }}>🗺️ No district data yet</div>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Top 5 Engineers" subtitle="By resolved count">
                  {topEngineers.length > 0 ? (
                    <div style={{ padding: '4px 0' }}>
                      {topEngineers.map((eng, i) => {
                        const avatarColors = ['#0F4C81', '#1A6BB5', '#E8741A', '#7C3AED', '#059669'];
                        const initials = (eng.name || 'E').charAt(0).toUpperCase();
                        return (
                        <div key={eng.email} className="mgmt-engineer-row">
                          <div className="mgmt-eng-rank" style={{ background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#E2E8F0', color: i < 3 ? '#1E293B' : '#64748B' }}>
                            {i + 1}
                          </div>
                          <div className="mgmt-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>{initials}</div>
                          <div className="mgmt-eng-info">
                            <div className="mgmt-eng-name">{eng.name}</div>
                          </div>
                          <div className="mgmt-eng-stats">
                            <div className="mgmt-eng-stat">
                              <span className="mgmt-eng-stat-val">{eng.resolvedCount}</span>
                              <span className="mgmt-eng-stat-lbl">Resolved</span>
                            </div>
                            <div className="mgmt-eng-stat">
                              <span className="mgmt-eng-stat-val">{eng.pendingCount}</span>
                              <span className="mgmt-eng-stat-lbl">Pending</span>
                            </div>
                            <div className="mgmt-eng-stat">
                              <span className="mgmt-eng-stat-val">{eng.resolutionPct}%</span>
                              <span className="mgmt-eng-stat-lbl">Rate</span>
                            </div>
                            <div className="mgmt-eng-stat">
                              <span className="mgmt-eng-stat-val">{eng.avgResolutionDays != null ? `${eng.avgResolutionDays}d` : '-'}</span>
                              <span className="mgmt-eng-stat-lbl">Avg</span>
                            </div>
                          </div>
                          <div className="mgmt-eng-bar-wrap">
                            <div className="mgmt-eng-bar" style={{ width: `${eng.resolutionPct}%`, background: i === 0 ? '#0F4C81' : i === 1 ? '#1A6BB5' : i === 2 ? '#2E7DBA' : '#94A3B8' }} />
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: '40px 24px' }}>
                      <div className="empty-title" style={{ fontSize: '0.9rem', color: 'var(--gray-400)' }}>👷 No engineers with data</div>
                    </div>
                  )}
                </ChartCard>
              </div>
            </div>
          )}

          {/* === COMPLAINTS TAB === */}
          {activeTab === 'complaints' && (
            <div>
              <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 className="mb-1">All Complaints</h2>
                  <p className="text-sm text-muted">View-only complaint list &mdash; {complaintsTotal} total</p>
                </div>
                <input type="text" className="form-control" placeholder="Search ticket ID, district, facility..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ maxWidth: 320, fontSize: '0.85rem' }} />
              </div>

              <div className="mgmt-filter-bar" style={{ marginBottom: 16, padding: '12px 20px' }}>
                <div className="mgmt-filter-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ flex: 'none', minWidth: 0 }}>
                    <label className="form-label">Status</label>
                    <div className="mgmt-filter-chips" style={{ gap: 3 }}>
                      {[
                        { val: '', label: 'All' },
                        { val: 'open', label: 'Open' },
                        { val: 'in_progress', label: 'Active' },
                        { val: 'resolved', label: 'Done' },
                        { val: 'closed', label: 'Closed' },
                      ].map(({ val, label }) => (
                        <button key={val} type="button"
                          className={`btn btn-sm ${filters.status === val ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: 32 }}
                          onClick={() => handleFilterChange('status', val)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mgmt-filter-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto', gap: 10, alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">District</label>
                    <select className="form-control" value={filters.district} onChange={e => handleFilterChange('district', e.target.value)}>
                      <option value="">All</option>
                      {districtList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={filters.priority} onChange={e => handleFilterChange('priority', e.target.value)}>
                      <option value="">All</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Engineer</label>
                    <select className="form-control" value={filters.engineer} onChange={e => handleFilterChange('engineer', e.target.value)}>
                      <option value="">All</option>
                      {engineerList.map(eng => <option key={eng._id} value={eng._id}>{eng.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Range</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="date" className="form-control" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} style={{ fontSize: '0.8rem' }} />
                      <input type="date" className="form-control" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} style={{ fontSize: '0.8rem' }} />
                    </div>
                  </div>
                  <div className="mgmt-filter-clear">
                    <label className="form-label">&nbsp;</label>
                    <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear</button>
                  </div>
                </div>
              </div>

              {complaintsLoading ? (
                <div className="flex-center" style={{ padding: 40 }}><span className="spinner spinner-dark" /></div>
              ) : (
                <>
                  <div className="table-wrapper">
                    <table className="mgmt-table">
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
                            <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(c.createdAt)}</td>
                            <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(c.updatedAt)}</td>
                            <td>
                              <button className="btn btn-ghost btn-sm" title="View Timeline"
                                onClick={() => setTimelineTarget(c)} style={{ fontSize: '0.85rem' }}>
                                📋
                              </button>
                            </td>
                          </tr>
                        ))}
                        {complaints.length === 0 && (
                          <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>No complaints match the current filters</div>
                            <button className="btn btn-ghost btn-sm mt-2" onClick={clearFilters}>Clear all filters</button>
                          </td></tr>
                        )}
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
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="mb-1">Engineer Performance</h2>
                  <p className="text-sm text-muted">All engineers &mdash; read-only view</p>
                </div>
              </div>

              {stats?.engineerPerformance?.length > 0 ? (
                <div className="table-wrapper">
                  <table className="mgmt-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Assigned</th>
                        <th>Resolved</th>
                        <th>Pending</th>
                        <th>Closed</th>
                        <th>Avg Time</th>
                        <th>Resolution %</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.engineerPerformance.map((eng, i) => (
                        <tr key={eng.email} className={i < 5 ? 'mgmt-top-row' : ''}>
                          <td className="font-bold" style={{ color: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#64748B' }}>{i + 1}</td>
                          <td className="font-semibold">{eng.name}</td>
                          <td>{eng.totalAssigned}</td>
                          <td style={{ color: '#1A7A4A', fontWeight: 600 }}>{eng.resolvedCount}</td>
                          <td style={{ color: eng.pendingCount > 0 ? '#B45309' : '#64748B' }}>{eng.pendingCount}</td>
                          <td>{eng.closedCount}</td>
                          <td>{eng.avgResolutionDays != null ? `${eng.avgResolutionDays}d` : '-'}</td>
                          <td className="font-semibold">{eng.resolutionPct}%</td>
                          <td style={{ minWidth: 120 }}>
                            <div className="mgmt-progress-bar">
                              <div className="mgmt-progress-fill" style={{ width: `${eng.resolutionPct}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '60px 24px' }}>
                  <div className="empty-title text-muted">No engineer data available</div>
                </div>
              )}
            </div>
          )}

          {/* === REPORTS TAB === */}
          {activeTab === 'reports' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="mb-1">Reports</h2>
                  <p className="text-sm text-muted">Export complaint data with current filters</p>
                </div>
              </div>

              <div className="card" style={{ maxWidth: 600 }}>
                <div className="card-header"><span className="card-title">Export Complaints</span></div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Export Format</label>
                    <div className="flex gap-3" style={{ marginTop: 8 }}>
                      {['excel', 'pdf', 'json'].map(f => (
                        <label key={f} className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                          <input type="radio" name="reportType" value={f}
                            checked={reportType === f} onChange={e => setReportType(e.target.value)} />
                          <span className="text-sm">{f === 'json' ? 'JSON' : f === 'excel' ? 'Excel' : 'PDF'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group mt-3">
                    <label className="form-label">Current Filter Context</label>
                    <div className="text-sm text-muted" style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 6, marginTop: 4 }}>
                      {filters.district ? `District: ${filters.district} | ` : ''}
                      {filters.status ? `Status: ${filters.status} | ` : ''}
                      {filters.priority ? `Priority: ${filters.priority} | ` : ''}
                      {filters.startDate ? `From: ${filters.startDate} | ` : ''}
                      {filters.endDate ? `To: ${filters.endDate}` : ''}
                      {!filters.district && !filters.status && !filters.priority && !filters.startDate && !filters.endDate ? 'All complaints (no active filters)' : ''}
                    </div>
                  </div>
                  <button className="btn btn-primary mt-3" onClick={exportReport}>
                    ⬇ Export {reportType.toUpperCase()} Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Timeline Modal */}
      {timelineTarget && <TimelineModal complaint={timelineTarget} onClose={() => setTimelineTarget(null)} />}
    </div>
  );
}
