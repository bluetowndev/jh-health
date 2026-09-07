import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useTheme from '../hooks/useTheme';
import { getTeamLeadStats, getTeamLeadComplaints, tlAssignComplaint, tlUpdateComplaintStatus, getEngineers, escapeHtml, escapeXml } from '../api';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import MaterialIcon from '../components/MaterialIcon';
import GlassSelect from '../components/GlassSelect';
import GlassDatePicker from '../components/GlassDatePicker';
import { DashboardSkeleton } from '../components/Skeleton';
import { NAV_ITEMS, STATUS_OPTIONS, PRIORITY_OPTIONS, PAGE_SIZES, PIE_COLORS, DISTRICT_COLORS } from '../utils/constants';
import { fmt } from '../utils/dates';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import { useLogoutConfirm } from '../hooks/useLogoutConfirm';

const TABS = ['overview', 'complaints', 'team', 'reports'];

function StatCard({ icon, value, label, color }) {
  return (
    <div className="card stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
      <div className="stat-icon" style={{ background: color + '18', color, width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value ?? '-'}</div>
        <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function TeamLeadDashboard() {
  const { user, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { confirmLogout, LogoutConfirmModal } = useLogoutConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState(() => searchParams.get('tab') || 'overview');
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [teamEngineers, setTeamEngineers] = useState([]);
  const [filter, setFilter] = useState({ status: '', district: '', priority: '', engineer: '', search: '', startDate: '', endDate: '' });
  const [sort, setSort] = useState('createdAt:desc');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals
  const [assignModal, setAssignModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [assignEngineer, setAssignEngineer] = useState('');
  const [statusForm, setStatusForm] = useState({ status: '', notes: '', priority: '', otp: '' });
  const [otpMode, setOtpMode] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [tlDistricts, setTlDistricts] = useState([]);
  const [districtSummary, setDistrictSummary] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const complaintsAbortRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'teamLead') navigate('/login');
  }, [user, navigate]);

  const loadStats = useCallback(async () => {
    try {
      const res = await getTeamLeadStats();
      setStats(res.data);
      setTeamMembers(res.data.engineerPerformance || []);
      setTlDistricts(res.data.tlDistricts || []);
      setDistrictSummary(res.data.districtSummary || []);
    } catch {
      toast.error('Failed to load dashboard data');
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    if (complaintsAbortRef.current) complaintsAbortRef.current.abort();
    const controller = new AbortController();
    complaintsAbortRef.current = controller;
    try {
      setLoading(true);
      const params = { page, limit, sort };
      Object.entries(filter).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await getTeamLeadComplaints(params, { signal: controller.signal });
      setComplaints(res.data.complaints);
      setTotalComplaints(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to load complaints');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, filter]);

  const loadTeamEngineers = useCallback(async () => {
    try {
      const res = await getEngineers();
      const myIds = teamMembers.map(m => m._id);
      setTeamEngineers(res.data.filter(e => myIds.includes(e._id)));
    } catch {
      toast.error('Failed to load engineers');
    }
  }, [teamMembers]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'complaints') loadComplaints(); }, [tab, loadComplaints]);
  useEffect(() => { if (tab === 'team') loadTeamEngineers(); }, [tab, loadTeamEngineers]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && TABS.includes(t)) setTab(t);
  }, [searchParams]);

  const switchTab = (t) => {
    setTab(t);
    setSearchParams(t === 'overview' ? {} : { tab: t });
    setSidebarOpen(false);
  };

  // Export
  const exportData = async (format) => {
    try {
      const params = { page: 1, limit: 5000 };
      Object.entries(filter).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await getTeamLeadComplaints(params);
      const rows = res.data.complaints;
      if (!rows.length) return toast.error('No data to export');

      if (format === 'json') {
        downloadBlob(JSON.stringify(rows, null, 2), 'team-complaints.json', 'application/json');
      } else if (format === 'csv') {
        const headers = ['Ticket ID', 'Complainant', 'Mobile', 'District', 'Facility', 'Issues', 'Priority', 'Status', 'Assigned To', 'Created'];
        const csvRows = rows.map(r => [r.ticketId, r.userName, r.mobile, r.district, r.facilityName, (r.issueCategory || []).join('; '), r.priority, r.status, r.assignedTo?.name || '-', r.createdAt].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
        downloadBlob([headers.join(','), ...csvRows].join('\n'), 'team-complaints.csv', 'text/csv');
      } else if (format === 'excel') {
        const headers = ['Ticket ID', 'Complainant', 'Mobile', 'District', 'Facility', 'Issues', 'Priority', 'Status', 'Assigned To', 'Created'];
        const xmlRows = rows.map(r => `<Row><Cell><Data t="String">${escapeXml(r.ticketId)}</Data></Cell><Cell><Data t="String">${escapeXml(r.userName)}</Data></Cell><Cell><Data t="String">${escapeXml(r.mobile)}</Data></Cell><Cell><Data t="String">${escapeXml(r.district)}</Data></Cell><Cell><Data t="String">${escapeXml(r.facilityName)}</Data></Cell><Cell><Data t="String">${escapeXml((r.issueCategory || []).join('; '))}</Data></Cell><Cell><Data t="String">${escapeXml(r.priority)}</Data></Cell><Cell><Data t="String">${escapeXml(r.status)}</Data></Cell><Cell><Data t="String">${escapeXml(r.assignedTo?.name || '-')}</Data></Cell><Cell><Data t="String">${escapeXml(r.createdAt)}</Data></Cell></Row>`);
        const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Complaints"><Table>${xmlRows.map(r => `<Row>${r.match(/<Cell>.*?<\/Cell>/g)?.join('') || ''}</Row>`).join('')}</Table></Worksheet></Workbook>`;
        downloadBlob(xml, 'team-complaints.xml', 'application/vnd.ms-excel');
      } else if (format === 'pdf') {
        const w = window.open('', '_blank');
        if (!w) { toast.error('Popup blocked. Please allow popups for this site.'); return; }
        w.document.write(`<html><head><title>Team Complaints</title><style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:left;font-size:11px}th{background:#0F4C81;color:white}tr:nth-child(even){background:#f9f9f9}</style></head><body><h2>Team Lead Complaint Report</h2><table><thead><tr><th>Ticket</th><th>Complainant</th><th>District</th><th>Facility</th><th>Issues</th><th>Priority</th><th>Status</th><th>Engineer</th><th>Created</th></tr></thead><tbody>${rows.map(r => `<tr><td>${escapeHtml(r.ticketId)}</td><td>${escapeHtml(r.userName)}</td><td>${escapeHtml(r.district)}</td><td>${escapeHtml(r.facilityName)}</td><td>${escapeHtml((r.issueCategory || []).join(', '))}</td><td>${escapeHtml(r.priority)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.assignedTo?.name || '-')}</td><td>${escapeHtml(new Date(r.createdAt).toLocaleDateString('en-IN'))}</td></tr>`).join('')}</tbody></table></body></html>`);
        w.document.close();
        w.onload = () => w.print();
      }
      toast.success(`Exported ${rows.length} records as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Assign
  const handleAssign = async () => {
    if (!assignEngineer) return toast.error('Select an engineer');
    try {
      await tlAssignComplaint(assignModal._id, assignEngineer);
      toast.success('Complaint reassigned');
      setAssignModal(null);
      loadComplaints();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    }
  };

  // Status update
  const handleStatusUpdate = async () => {
    const { status, notes, priority, otp } = statusForm;
    if (!status) return toast.error('Select a status');
    try {
      const res = await tlUpdateComplaintStatus(statusModal._id, { status, notes, priority, otp });
      if (res.data.requiresOtp) {
        setOtpMode(true);
        setOtpMessage(res.data.message);
        return;
      }
      toast.success('Status updated');
      setStatusModal(null);
      setOtpMode(false);
      setStatusForm({ status: '', notes: '', priority: '', otp: '' });
      loadComplaints();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const toggleSort = (field) => {
    setSort(prev => prev === `${field}:asc` ? `${field}:desc` : `${field}:asc`);
    setPage(1);
  };

  const updateFilter = (key, val) => {
    setFilter(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  const chartData = useMemo(() => {
    if (!stats) return { status: [], monthly: [] };
    const status = [
      { name: 'Open', value: stats.open || 0 },
      { name: 'In Progress', value: stats.inProgress || 0 },
      { name: 'Resolved', value: stats.resolved || 0 },
      { name: 'Closed', value: stats.closed || 0 }
    ].filter(d => d.value > 0);
    return { status, monthly: [] };
  }, [stats]);

  if (!user || user.role !== 'teamLead') return null;

  const navItems = NAV_ITEMS.teamLead || [];

  return (
    <div className="page-wrapper">
      <nav className="navbar glass-navbar">
        <div className="navbar-inner navbar-inner-split">
          <div className="navbar-logo-slot navbar-logo-slot--left navbar-admin-left">
            <button type="button" className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><MaterialIcon name="menu" size={24} /></button>
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
              <span className="navbar-role navbar-role--compact">Team Lead</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="dashboard-layout">
        {/* Mobile sidebar */}
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden={!sidebarOpen} />
        <aside className={`sidebar-mobile ${sidebarOpen ? 'open' : ''}`}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Menu</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(false)} style={{ padding: '4px 8px' }}><MaterialIcon name="close" size={24} /></button>
          </div>
          <div className="sidebar-section" style={{ paddingTop: 16 }}>
            <div className="sidebar-label">Navigation</div>
            {navItems.map(item => (
              <div key={item.path} className={`sidebar-link material-nav-item ${tab === (item.path.split('=')[1] || 'overview') ? 'active' : ''}`}
                role="link" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTab(item.path.split('=')[1] || 'overview'); setSidebarOpen(false); } }}
                onClick={() => { switchTab(item.path.split('=')[1] || 'overview'); setSidebarOpen(false); }}>
                <span><MaterialIcon name={item.icon} size={20} /></span> {item.label}
              </div>
            ))}
          </div>
          <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open('/', '_blank'); setSidebarOpen(false); } }}
              onClick={() => { window.open('/', '_blank'); setSidebarOpen(false); }}>
              <span><MaterialIcon name="home" size={20} /></span> Public Portal
            </div>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0}
              onClick={toggleTheme}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); } }}>
              <span><MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} /></span> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </div>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmLogout(); setSidebarOpen(false); } }}
              onClick={() => { confirmLogout(); setSidebarOpen(false); }}>
              <span><MaterialIcon name="logout" size={20} /></span> Logout
            </div>
          </div>
        </aside>

        {/* Desktop sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Navigation</div>
            {navItems.map(item => (
              <div key={item.path} className={`sidebar-link material-nav-item ${tab === (item.path.split('=')[1] || 'overview') ? 'active' : ''}`}
                role="link" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTab(item.path.split('=')[1] || 'overview'); } }}
                onClick={() => switchTab(item.path.split('=')[1] || 'overview')}>
                <span><MaterialIcon name={item.icon} size={20} /></span> {item.label}
              </div>
            ))}
          </div>
          <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open('/', '_blank'); } }}
              onClick={() => window.open('/', '_blank')}>
              <span><MaterialIcon name="home" size={20} /></span> Public Portal
            </div>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0}
              onClick={toggleTheme}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); } }}>
              <span><MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} /></span> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </div>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmLogout(); } }}
              onClick={confirmLogout}>
              <span><MaterialIcon name="logout" size={20} /></span> Logout
            </div>
          </div>
        </aside>

        <main className="main-content">
          {/* ========== OVERVIEW ========== */}
          {tab === 'overview' && !stats && (
            <DashboardSkeleton />
          )}
          {tab === 'overview' && stats && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Team Overview</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Monitor your team's performance across all districts</p>
              </div>

              {teamMembers.length === 0 && (
                <EmptyState
                  icon="engineering"
                  title="No Engineers Found"
                  description={tlDistricts.length > 0
                    ? `No field engineers are assigned to your districts (${tlDistricts.join(', ')}). Ask the admin to create engineers with these districts and set your name as their Team Lead.`
                    : 'No districts are assigned to your account and no engineers are linked to you. Ask the admin to assign districts to your account and link engineers to you.'}
                  action={
                    <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, textAlign: 'left', fontSize: '0.8rem', color: '#1e40af', maxWidth: 400 }}>
                      <strong>Setup steps for Admin:</strong>
                      <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                        <li>Create engineers with role "Engineer" and assign districts</li>
                        <li>Set Team Lead to your name when creating/editing engineers</li>
                        <li>Or assign districts to your account that match the engineers' districts</li>
                      </ol>
                    </div>
                  }
                />
              )}

              {/* KPI Strip */}
              <div className="responsive-kpi-grid stagger-children material-kpi" style={{ marginBottom: 24 }}>
                {[
                  { value: `${stats.resolutionPct || 0}%`, label: 'Resolution', color: '#22c55e' },
                  { value: `${stats.avgResolutionDays ?? '-'}d`, label: 'Avg Time', color: '#6366f1' },
                  { value: stats.teamSize || 0, label: 'Engineers', color: '#3b82f6' },
                  { value: stats.createdToday || 0, label: 'New Today', color: '#f97316' },
                  { value: stats.resolvedToday || 0, label: 'Resolved Today', color: '#22c55e' },
                  { value: stats.resolved || 0, label: 'Resolved', color: '#10b981' },
                  { value: stats.closed || 0, label: 'Closed', color: '#6b7280' },
                  { value: stats.closedToday || 0, label: 'Closed Today', color: '#8b5cf6' },
                ].map((item, i) => (
                  <div key={i} className="mgmt-kpi-card glass-card" style={{ flexDirection: 'column', textAlign: 'center', borderTop: `3px solid ${item.color}` }}>
                    <div className="mgmt-kpi-value" style={{ color: item.color }}>{item.value}</div>
                    <div className="mgmt-kpi-label">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Status Distribution Cards */}
              <div className="responsive-grid-5" style={{ marginBottom: 24 }}>
                {[
                  { icon: 'assessment', value: stats.total, label: 'Total', color: '#6366f1', bg: '#eef2ff' },
                  { icon: 'radio_button_checked', value: stats.open, label: 'Open', color: '#ef4444', bg: '#fef2f2' },
                  { icon: 'pending', value: stats.inProgress, label: 'In Progress', color: '#f59e0b', bg: '#fffbeb' },
                  { icon: 'check_circle', value: stats.resolved, label: 'Resolved', color: '#22c55e', bg: '#f0fdf4' },
                  { icon: 'check_circle_outline', value: stats.closed, label: 'Closed', color: '#6b7280', bg: '#f9fafb' },
                ].map((item, i) => (
                  <div key={i} className="card" style={{ padding: '16px 12px', textAlign: 'center', borderTop: `3px solid ${item.color}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '1.2rem' }}><MaterialIcon name={item.icon} size={20} /></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="responsive-grid-2-1" style={{ marginBottom: 24 }}>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Status Distribution</h3>
                  {chartData.status.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={chartData.status} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {chartData.status.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 40 }}>No data</p>}
                </div>

                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Engineer Leaderboard</h3>
                  {stats.engineerPerformance?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engineer</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolved</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.engineerPerformance.map((e, i) => (
                            <tr key={e._id || i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} onMouseEnter={e2 => e2.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.02))'} onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '10px 8px', fontWeight: 500, color: 'var(--text-muted)' }}>{i + 1}</td>
                              <td style={{ padding: '10px 8px', fontWeight: 600 }}>{e.name}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>{e.totalAssigned}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>{e.resolvedCount}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: '#f97316', fontWeight: 600 }}>{(e.openCount || 0) + (e.inProgressCount || 0)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${e.resolutionPct || 0}%`, height: '100%', background: e.resolutionPct >= 70 ? '#22c55e' : e.resolutionPct >= 40 ? '#eab308' : '#f97316', borderRadius: 3, transition: 'width 0.3s' }} />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 32 }}>{e.resolutionPct || 0}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 40 }}>No team members</p>}
                </div>
              </div>

              {/* Oldest Pending Alert */}
              {stats.oldestPending && (
                <div className="card" style={{ marginBottom: 24, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
                  <span style={{ fontSize: '1.2rem' }}><MaterialIcon name="warning" size={20} color="#E8741A" /></span>
                  <div>
                    <span style={{ fontWeight: 600, color: '#92400e', fontSize: '0.85rem' }}>Oldest Pending: </span>
                    <span style={{ color: '#78350f', fontSize: '0.85rem' }}>{stats.oldestPending.ticketId} - {stats.oldestPending.facilityName} ({stats.oldestPending.district})</span>
                  </div>
                </div>
              )}

              {/* District Summary */}
              {districtSummary.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>District Summary</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Performance breakdown by district</p>
                  </div>
                  <div className="responsive-card-grid">
                    {districtSummary.map((d, i) => {
                      const color = DISTRICT_COLORS[i % DISTRICT_COLORS.length];
                      const resolutionRate = d.totalComplaints > 0 ? Math.round(d.resolvedComplaints / d.totalComplaints * 100) : 0;
                      return (
                        <div key={d.district} className="card hover-lift glass-card" style={{ padding: 20, borderTop: `3px solid ${color}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color }}>{d.district}</div>
                            <span style={{ fontSize: '0.7rem', background: color + '18', color, padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>{d.engineers.length} FEs</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                            <div style={{ textAlign: 'center', padding: '8px 0', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8 }}>
                              <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '1.1rem' }}>{d.totalComplaints}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Total</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '8px 0', background: '#f0fdf4', borderRadius: 8 }}>
                              <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '1.1rem' }}>{d.resolvedComplaints}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Resolved</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '8px 0', background: '#fff7ed', borderRadius: 8 }}>
                              <div style={{ fontWeight: 700, color: '#f97316', fontSize: '1.1rem' }}>{d.pendingComplaints}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Pending</div>
                            </div>
                          </div>
                          <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${resolutionRate}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 3, transition: 'width 0.5s ease' }} />
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'right', fontWeight: 500 }}>{resolutionRate}% resolved</div>
                          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {d.engineers.map(e => (
                              <span key={e._id} style={{ fontSize: '0.65rem', background: 'var(--bg-secondary, #f1f5f9)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>
                                {e.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== COMPLAINTS ========== */}
          {tab === 'complaints' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Team Complaints</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage and track all complaints across your team ({totalComplaints} total)</p>
              </div>

              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {['', ...STATUS_OPTIONS].map(s => (
                      <button key={s} type="button"
                        className={`btn btn-sm ${filter.status === s ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '5px 14px', fontSize: '0.78rem', borderRadius: 6 }}
                        onClick={() => updateFilter('status', s)}>
                        {s || 'All'}
                      </button>
                    ))}
                  </div>
                  <GlassSelect value={String(limit)} onChange={v => { setLimit(Number(v)); setPage(1); }} options={PAGE_SIZES.map(s => ({ value: String(s), label: `${s} / page` }))} style={{ width: 72, fontSize: '0.8rem' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className="form-control" style={{ flex: '1 1 160px', fontSize: '0.85rem' }} placeholder="Search ticket/facility..." value={filter.search} onChange={e => updateFilter('search', e.target.value)} />
                  <GlassSelect value={filter.district} onChange={v => updateFilter('district', v)} options={[{ value: '', label: 'All Districts' }, ...tlDistricts.map(d => ({ value: d, label: d }))]} style={{ flex: '1 1 130px', fontSize: '0.85rem' }} />
                  <GlassSelect value={filter.priority} onChange={v => updateFilter('priority', v)} options={[{ value: '', label: 'All Priority' }, ...PRIORITY_OPTIONS.map(p => ({ value: p, label: p }))]} style={{ flex: '1 1 130px', fontSize: '0.85rem' }} />
                  <GlassSelect value={filter.engineer} onChange={v => updateFilter('engineer', v)} options={[{ value: '', label: 'All Engineers' }, ...teamMembers.map(e => ({ value: e._id, label: e.name }))]} style={{ flex: '1 1 130px', fontSize: '0.85rem' }} />
                  <GlassDatePicker value={filter.startDate} onChange={v => updateFilter('startDate', v)} style={{ flex: '1 1 120px', fontSize: '0.85rem' }} />
                  <GlassDatePicker value={filter.endDate} onChange={v => updateFilter('endDate', v)} style={{ flex: '1 1 120px', fontSize: '0.85rem' }} />
                  <button className="btn btn-outline btn-sm" onClick={() => { setFilter({ status: '', district: '', priority: '', engineer: '', search: '', startDate: '', endDate: '' }); setPage(1); }} style={{ fontSize: '0.8rem' }}>Clear</button>
                </div>
              </div>

              {loading ? (
                <div className="flex-center" style={{ padding: 60 }}><span className="spinner spinner-dark" /></div>
              ) : complaints.length === 0 ? (
                <EmptyState
                  icon="assignment"
                  title="No complaints found"
                  description="No complaints match the current filters. Try adjusting your search criteria."
                  action={
                    <button className="btn btn-outline btn-sm" onClick={() => { setFilter({ status: '', district: '', priority: '', engineer: '', search: '', startDate: '', endDate: '' }); setPage(1); }}>
                      Clear Filters
                    </button>
                  }
                />
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="mobile-complaint-card">
                    {complaints.map(c => (
                      <div key={c._id} className="mobile-complaint-card" style={{ display: 'block', marginBottom: 12 }}>
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
                            <button className="btn btn-outline btn-xs" onClick={() => { setAssignModal(c); setAssignEngineer(c.assignedTo?._id || ''); }}>Assign</button>
                            <button className="btn btn-primary btn-xs" onClick={() => { setStatusModal(c); setStatusForm({ status: '', notes: '', priority: c.priority, otp: '' }); setOtpMode(false); }}>Status</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="table-scroll-wrapper swipe-hint">
                  <div className="table-wrapper material-table">
                    <table className="material-table">
                    <thead>
                      <tr>
                        <th onClick={() => toggleSort('ticketId')} style={{ cursor: 'pointer' }}>Ticket {sort.includes('ticketId') ? (sort.endsWith('asc') ? '\u25B2' : '\u25BC') : ''}</th>
                        <th>Complainant</th>
                        <th>District</th>
                        <th>Facility</th>
                        <th>Issues</th>
                        <th onClick={() => toggleSort('priority')} style={{ cursor: 'pointer' }}>Priority {sort.includes('priority') ? (sort.endsWith('asc') ? '\u25B2' : '\u25BC') : ''}</th>
                        <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>Status {sort.includes('status') ? (sort.endsWith('asc') ? '\u25B2' : '\u25BC') : ''}</th>
                        <th>Assigned To</th>
                        <th onClick={() => toggleSort('createdAt')} style={{ cursor: 'pointer' }}>Created {sort.includes('createdAt') ? (sort.endsWith('asc') ? '\u25B2' : '\u25BC') : ''}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map(c => (
                        <tr key={c._id}>
                          <td><strong>{c.ticketId}</strong></td>
                          <td>{c.userName}<br /><small style={{ color: 'var(--text-muted)' }}>{c.mobile}</small></td>
                          <td>{c.district}</td>
                          <td>{c.facilityName}</td>
                          <td><small>{(c.issueCategory || []).slice(0, 2).join(', ')}{(c.issueCategory || []).length > 2 ? ` +${c.issueCategory.length - 2}` : ''}</small></td>
                          <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>{c.assignedTo?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                          <td><small>{fmt(c.createdAt)}</small></td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-outline btn-xs" onClick={() => { setAssignModal(c); setAssignEngineer(c.assignedTo?._id || ''); }}>Assign</button>
                              <button className="btn btn-primary btn-xs" onClick={() => { setStatusModal(c); setStatusForm({ status: '', notes: '', priority: c.priority, otp: '' }); setOtpMode(false); }}>Status</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
                </>
              )}

              {pages > 1 && (
                <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <span style={{ fontSize: '0.85rem' }}>Page {page} of {pages}</span>
                  <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}
            </div>
          )}

          {/* ========== MY TEAM ========== */}
          {tab === 'team' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>My Team</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage and monitor your field engineers</p>
              </div>
              {tlDistricts.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                  <button
                    className={`btn btn-sm ${selectedDistrict === '' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedDistrict('')}
                    style={{ borderRadius: 6 }}
                  >All Districts</button>
                  {tlDistricts.map(d => (
                    <button
                      key={d}
                      className={`btn btn-sm ${selectedDistrict === d ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedDistrict(d)}
                      style={{ borderRadius: 6 }}
                    >
                      {d} ({districtSummary.find(ds => ds.district === d)?.engineers?.length || 0})
                    </button>
                  ))}
                </div>
              )}

              {teamMembers.length === 0 ? (
                <EmptyState
                  icon="engineering"
                  title="No Engineers in Your Team"
                  description={tlDistricts.length > 0
                    ? `No field engineers are assigned to your districts (${tlDistricts.join(', ')}). Ask the admin to create engineers with these districts and set your name as their Team Lead.`
                    : 'No districts are assigned to your account. Ask the admin to assign districts to your account.'}
                />
              ) : selectedDistrict ? (
                /* Grouped by selected district */
                <div>
                  {districtSummary.filter(d => d.district === selectedDistrict).map(d => (
                    <div key={d.district}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                        <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 600 }}>{d.district}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({d.engineers.length} engineers)</span>
                      </div>
                      <div className="responsive-card-grid">
                        {d.engineers.map(e => (
                          <div key={e._id} className="card hover-lift glass-card stagger-children" style={{ padding: 20, borderTop: '3px solid #6366f1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                                {(e.name || '?')[0].toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{e.name}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.email}</div>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                              <div style={{ padding: '8px 0', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#6366f1', fontSize: '1.1rem' }}>{e.totalAssigned}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total</div></div>
                              <div style={{ padding: '8px 0', background: '#f0fdf4', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#22c55e', fontSize: '1.1rem' }}>{e.resolvedCount}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Resolved</div></div>
                              <div style={{ padding: '8px 0', background: '#fff7ed', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#f97316', fontSize: '1.1rem' }}>{(e.openCount || 0) + (e.inProgressCount || 0)}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pending</div></div>
                              <div style={{ padding: '8px 0', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8 }}><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{e.resolutionPct || 0}%</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Rate</div></div>
                            </div>
                            <div style={{ marginTop: 14, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${e.resolutionPct || 0}%`, height: '100%', background: e.resolutionPct >= 70 ? '#22c55e' : e.resolutionPct >= 40 ? '#eab308' : '#f97316', borderRadius: 3, transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* All districts view - show all engineers in a grid */
                <div className="responsive-card-grid">
                  {teamMembers.map(e => {
                    const pending = (e.openCount || 0) + (e.inProgressCount || 0);
                    return (
                      <div key={e._id} className="card hover-lift" style={{ padding: 20, borderTop: '3px solid #3b82f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                            {(e.name || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{e.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.email}</div>
                            {e.assignedDistricts?.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                {e.assignedDistricts.map(d => (
                                  <span key={d} style={{ fontSize: '0.6rem', background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{d}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                          <div style={{ padding: '8px 0', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#6366f1', fontSize: '1.1rem' }}>{e.totalAssigned}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total</div></div>
                          <div style={{ padding: '8px 0', background: '#f0fdf4', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#22c55e', fontSize: '1.1rem' }}>{e.resolvedCount}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Resolved</div></div>
                          <div style={{ padding: '8px 0', background: '#fff7ed', borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#f97316', fontSize: '1.1rem' }}>{pending}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pending</div></div>
                          <div style={{ padding: '8px 0', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8 }}><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{e.resolutionPct || 0}%</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Rate</div></div>
                        </div>
                        <div style={{ marginTop: 14, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${e.resolutionPct || 0}%`, height: '100%', background: e.resolutionPct >= 70 ? '#22c55e' : e.resolutionPct >= 40 ? '#eab308' : '#f97316', borderRadius: 3, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========== REPORTS ========== */}
          {tab === 'reports' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Export Reports</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Download team data in your preferred format</p>
              </div>
              <div className="responsive-card-grid-sm">
                {[
                  { format: 'excel', label: 'Excel Spreadsheet', icon: 'table_chart', color: '#22c55e', bg: '#f0fdf4', desc: 'Full workbook with charts' },
                  { format: 'csv', label: 'CSV Document', icon: 'description', color: '#3b82f6', bg: '#eff6ff', desc: 'Comma-separated values' },
                  { format: 'pdf', label: 'PDF Report', icon: 'feed', color: '#ef4444', bg: '#fef2f2', desc: 'Print-ready document' },
                  { format: 'json', label: 'JSON Data', icon: 'code', color: '#8b5cf6', bg: '#f5f3ff', desc: 'Raw structured data' }
                ].map(({ format, label, icon, color, bg, desc }) => (
                  <button key={format} onClick={() => exportData(format)}
                    className="card hover-lift material-export-card"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 16px', cursor: 'pointer', borderTop: `3px solid ${color}` }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}><MaterialIcon name={icon} size={24} /></div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{desc}</span>
                  </button>
                ))}
              </div>
              <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Currently showing: {filter.status || 'All statuses'} {filter.startDate ? `from ${filter.startDate}` : ''} {filter.endDate ? `to ${filter.endDate}` : ''}
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ========== ASSIGN MODAL ========== */}
      {assignModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setAssignModal(null)}
          onKeyDown={e => { if (e.key === 'Escape') setAssignModal(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reassign Complaint</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setAssignModal(null)}><MaterialIcon name="close" size={24} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Ticket: <strong>{assignModal.ticketId}</strong> | Facility: {assignModal.facilityName}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>District: <strong>{assignModal.district}</strong></p>
              <div className="form-group">
                <label className="form-label">Select Engineer ({assignModal.district} district)</label>
                <GlassSelect
                  value={assignEngineer}
                  onChange={v => setAssignEngineer(v)}
                  options={[
                    { value: '', label: '-- Select --' },
                    ...teamMembers
                      .filter(e => {
                        const engDistricts = e.assignedDistricts || [];
                        return engDistricts.length === 0 || engDistricts.includes(assignModal.district);
                      })
                      .map(e => ({ value: e._id, label: `${e.name} (${e.assignedDistricts?.join(', ') || 'All districts'})` }))
                  ]}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign}>Reassign</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== STATUS MODAL ========== */}
      {statusModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => { setStatusModal(null); setOtpMode(false); }}
          onKeyDown={e => { if (e.key === 'Escape') { setStatusModal(null); setOtpMode(false); } }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Status</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setStatusModal(null); setOtpMode(false); }}><MaterialIcon name="close" size={24} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>Ticket: <strong>{statusModal.ticketId}</strong> | Current: <StatusBadge status={statusModal.status} /></p>

              {!otpMode ? (
                <>
                  <div className="form-group">
                    <label className="form-label">New Status</label>
                    <GlassSelect value={statusForm.status} onChange={v => setStatusForm(f => ({ ...f, status: v }))} options={[{ value: '', label: '-- Select --' }, ...STATUS_OPTIONS.map(s => ({ value: s, label: s }))]} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <GlassSelect value={statusForm.priority} onChange={v => setStatusForm(f => ({ ...f, priority: v }))} options={PRIORITY_OPTIONS.map(p => ({ value: p, label: p }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={3} value={statusForm.notes} onChange={e => setStatusForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <div style={{ background: '#dbeafe', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: '0.85rem', color: '#1e40af' }}>{otpMessage}</div>
                  <label className="form-label">Enter 6-digit OTP from complainant</label>
                  <input className="form-control" maxLength={6} value={statusForm.otp} onChange={e => setStatusForm(f => ({ ...f, otp: e.target.value.replace(/\D/g, '') }))} placeholder="000000" autoFocus />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setStatusModal(null); setOtpMode(false); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStatusUpdate}>
                {otpMode ? 'Confirm Resolution' : statusForm.status === 'resolved' ? 'Request OTP' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {LogoutConfirmModal}
    </div>
  );
}
