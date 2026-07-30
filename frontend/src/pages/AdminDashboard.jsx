import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  getComplaints,
  getComplaintStats,
  getEngineers,
  assignComplaint,
  updateComplaintStatus,
  getUsers,
  registerUser,
  updateUser,
  deleteUser,
  getDistricts,
  getFacilityTypes,
  getFacilities,
  getNotificationDirectory,
  saveGlobalNotificationContacts,
  saveFacilityNotificationMapping
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import useTheme from '../hooks/useTheme';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'complaints', label: 'All Complaints', icon: '📋' },
  { id: 'engineers', label: 'Manage Users', icon: '👥' },
  { id: 'mapping', label: 'Facility Mapping', icon: '📡' },
  { id: 'unmapped', label: 'Unmapped Facilities', icon: '🧭' },
  { id: 'reports', label: 'Reports', icon: '📈' },
  { id: 'seed', label: 'Seed Facilities', icon: '🏥' },
];

const STATUS_COLORS = {
  open: '#1D4ED8',
  in_progress: '#B45309',
  resolved: '#1A7A4A',
  closed: '#64748B'
};

const CHART_COLORS = ['#0F4C81', '#1A6BB5', '#E8741A', '#1A7A4A', '#B45309', '#64748B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function StatCard({ icon, value, label, subtitle, color, trend }) {
  return (
    <div className="card premium-stat-card" style={{ borderLeft: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -12, right: -12, width: 80, height: 80, borderRadius: '50%', background: color + '0A', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          {subtitle && <div className="stat-subtitle">{subtitle}</div>}
        </div>
        <div className="premium-stat-icon" style={{ background: color + '18', color }}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="stat-trend" style={{ color: trend >= 0 ? '#1A7A4A' : '#B91C1C' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <div className="custom-chart-tooltip-label">{label}</div>
        {payload.map((entry, i) => (
          <div key={i} className="custom-chart-tooltip-value" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function ChartCard({ title, subtitle, children, action }) {
  return (
    <div className="card chart-card">
      <div className="card-header">
        <div>
          <h3 className="card-title" style={{ fontSize: '1rem' }}>{title}</h3>
          {subtitle && <div className="text-xs text-muted mt-1">{subtitle}</div>}
        </div>
        {action}
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [engineers, setEngineers] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ status: '', district: '', priority: '', engineer: '', startDate: '', endDate: '', issueCategory: '', search: '' });
  const [page, setPage] = useState(1);
  const [exportFormat, setExportFormat] = useState('excel');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modal, setModal] = useState(null); // 'assign' | 'status' | 'newUser' | 'editUser'
  const [modalData, setModalData] = useState({});
  const [statusAwaitingOtp, setStatusAwaitingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'engineer', assignedDistricts: '' });
  const [seedJson, setSeedJson] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { title, message, onConfirm }
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [directory, setDirectory] = useState(null);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [facilityTypeOptions, setFacilityTypeOptions] = useState([]);
  const [facilityOptions, setFacilityOptions] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingPage, setMappingPage] = useState(1);
  const [unmappedPage, setUnmappedPage] = useState(1);
  const [allFacilities, setAllFacilities] = useState([]);
  const districtsCache = useRef(null);
  const loadDistricts = useCallback(() => {
    if (districtsCache.current) { setDistrictOptions(districtsCache.current); return; }
    getDistricts().then(r => { districtsCache.current = r.data || []; setDistrictOptions(districtsCache.current); }).catch(() => {});
  }, []);
  const [mappingForm, setMappingForm] = useState({
    district: '',
    facilityType: '',
    facilityCode: '',
    facilityName: '',
    engineerName: '',
    engineerEmail: '',
    engineerMobile: '',
    teamLeadName: '',
    teamLeadEmail: '',
    teamLeadMobile: ''
  });
  const [globalContacts, setGlobalContacts] = useState({
    stateHeadName: '',
    stateHeadEmail: '',
    stateHeadMobile: '',
    opsManagerName: '',
    opsManagerEmail: '',
    opsManagerMobile: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    loadStats();
    getEngineers().then(r => setEngineers(r.data));
  }, [user]);

  useEffect(() => { if (activeTab === 'complaints') loadComplaints(); }, [activeTab, filter, page]);
  useEffect(() => { if (activeTab === 'complaints') { loadDistricts(); } }, [activeTab]);
  useEffect(() => { if (activeTab === 'engineers') getUsers().then(r => setUsers(r.data)); }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'mapping' || activeTab === 'unmapped') {
      loadDistricts();
      getFacilities('', '').then(r => setAllFacilities(r.data || [])).catch(() => setAllFacilities([]));
      getNotificationDirectory().then(r => {
        const doc = r.data;
        setDirectory(doc);
        setGlobalContacts({
          stateHeadName: doc?.stateHead?.name || '',
          stateHeadEmail: doc?.stateHead?.email || '',
          stateHeadMobile: doc?.stateHead?.mobile || '',
          opsManagerName: doc?.opsManager?.name || '',
          opsManagerEmail: doc?.opsManager?.email || '',
          opsManagerMobile: doc?.opsManager?.mobile || ''
        });
      });
    }
  }, [activeTab]);
  useEffect(() => {
    if (!mappingForm.district) return setFacilityTypeOptions([]);
    getFacilityTypes(mappingForm.district).then(r => setFacilityTypeOptions(r.data || [])).catch(() => setFacilityTypeOptions([]));
  }, [mappingForm.district]);
  useEffect(() => {
    if (!mappingForm.district || !mappingForm.facilityType) return setFacilityOptions([]);
    getFacilities(mappingForm.district, mappingForm.facilityType).then(r => setFacilityOptions(r.data || [])).catch(() => setFacilityOptions([]));
  }, [mappingForm.district, mappingForm.facilityType]);
  useEffect(() => { setMappingPage(1); }, [directory]);
  useEffect(() => { setUnmappedPage(1); }, [directory, allFacilities]);

  const loadStats = () => getComplaintStats().then(r => setStats(r.data)).catch(() => {});
  const loadComplaints = useCallback(() => {
    getComplaints({ ...filter, page, limit: 15 }).then(r => { setComplaints(r.data.complaints); setTotal(r.data.total); });
  }, [filter, page]);

  const statMap = (key) => stats?.statusStats?.find(s => s._id === key)?.count || 0;
  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const MAPPING_PAGE_SIZE = 25;
  const mappedRows = directory?.mappings || [];
  const mappingPages = Math.max(1, Math.ceil(mappedRows.length / MAPPING_PAGE_SIZE));
  const visibleMappedRows = mappedRows.slice((mappingPage - 1) * MAPPING_PAGE_SIZE, mappingPage * MAPPING_PAGE_SIZE);
  const mappedCodes = new Set(mappedRows.map(m => m.facilityCode));
  const unmappedRows = (allFacilities || []).filter(f => !mappedCodes.has(f.facility_code));
  const unmappedPages = Math.max(1, Math.ceil(unmappedRows.length / MAPPING_PAGE_SIZE));
  const visibleUnmappedRows = unmappedRows.slice((unmappedPage - 1) * MAPPING_PAGE_SIZE, unmappedPage * MAPPING_PAGE_SIZE);

  const handleAssign = async () => {
    setLoading(true);
    try { await assignComplaint(selectedComplaint._id, modalData.engineerId); setModal(null); toast.success('Complaint assigned'); loadComplaints(); loadStats(); }
    catch(e) { toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to assign'); }
    finally { setLoading(false); }
  };

  const handleStatus = async () => {
    setLoading(true);
    try {
      const payload = { status: modalData.status, notes: modalData.notes, priority: modalData.priority };
      if (modalData.status === 'resolved' && modalData.otp) payload.otp = modalData.otp;

      const res = await updateComplaintStatus(selectedComplaint._id, payload);

      if (res.data?.requiresOtp) {
        setStatusAwaitingOtp(true);
        setMsg(res.data.message || 'OTP sent to complainant. Enter the code they provide.');
      } else {
        setModal(null);
        setStatusAwaitingOtp(false);
        loadComplaints();
        loadStats();
      }
    } catch(e) { toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleNewUser = async () => {
    setLoading(true);
    try {
      await registerUser({ ...newUser, assignedDistricts: newUser.assignedDistricts.split(',').map(s => s.trim()).filter(Boolean) });
      setModal(null); toast.success('User created');
      getUsers().then(r => setUsers(r.data));
      setNewUser({ name: '', email: '', password: '', role: 'engineer', assignedDistricts: '' });
    } catch(e) { toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleEditUser = async () => {
    setLoading(true);
    try {
      await updateUser(newUser._id, {
        name: newUser.name,
        assignedDistricts: newUser.assignedDistricts.split(',').map(s => s.trim()).filter(Boolean)
      });
      setModal(null); toast.success('User updated');
      getUsers().then(r => setUsers(r.data));
      setNewUser({ name: '', email: '', password: '', role: 'engineer', assignedDistricts: '' });
    } catch(e) { toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (u) => {
    setConfirmAction({
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate "${u.name}" (${u.email})? They will not be able to log in.`,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await deleteUser(u._id);
          toast.success('User deactivated');
          getUsers().then(r => setUsers(r.data));
        } catch(e) { toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed'); }
      }
    });
  };

  const handleExport = async () => {
    try {
      const params = { ...filter, page: 1, limit: 5000 };
      const res = await getComplaints(params);
      const data = res.data.complaints;
      if (!data?.length) { setMsg('No data to export'); return; }

      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      if (exportFormat === 'pdf') {
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
<table><thead><tr><th>Ticket ID</th><th>Complainant</th><th>District</th><th>Facility</th><th>Issue</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Created</th></tr></thead><tbody>
${data.map(c => `<tr><td>${c.ticketId}</td><td>${c.userName}</td><td>${c.district}</td><td>${c.facilityName}</td><td>${(c.issueCategory || []).join('; ')}</td><td>${c.priority}</td><td>${c.status}</td><td>${c.assignedTo?.name || '-'}</td><td>${fmtDate(c.createdAt)}</td></tr>`).join('')}
</tbody></table>
<div class="footer">Digital Sanchar Sathi — Jharkhand Health WiFi Complaint Management System</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
        win.document.close();
        return;
      }

      let content, mime, ext;
      if (exportFormat === 'excel') {
        const headers = ['Ticket ID', 'Complainant', 'District', 'Facility', 'Issue', 'Priority', 'Status', 'Assigned To', 'Created'];
        const rows = data.map(c => [c.ticketId, c.userName, c.district, c.facilityName, (c.issueCategory || []).join('; '), c.priority, c.status, c.assignedTo?.name || '-', c.createdAt]);
        let xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Complaints"><Table>';
        xml += '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>';
        rows.forEach(r => {
          xml += '<Row>' + r.map(v => `<Cell><Data ss:Type="String">${String(v ?? '')}</Data></Cell>`).join('') + '</Row>';
        });
        xml += '</Table></Worksheet></Workbook>';
        content = xml;
        mime = 'application/vnd.ms-excel';
        ext = 'xls';
      } else if (exportFormat === 'csv') {
        const csvHeaders = ['Ticket ID', 'Complainant', 'District', 'Facility', 'Issue', 'Priority', 'Status', 'Assigned To', 'Created'];
        const csvRows = data.map(c => [c.ticketId, c.userName, c.district, c.facilityName, (c.issueCategory || []).join('; '), c.priority, c.status, c.assignedTo?.name || '-', c.createdAt]);
        content = [csvHeaders.join(','), ...csvRows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
        mime = 'text/csv'; ext = 'csv';
      } else {
        const rows = data.map(c => ({
          ticketId: c.ticketId, complainant: c.userName, district: c.district, facility: c.facilityName,
          issue: (c.issueCategory || []).join('; '), priority: c.priority, status: c.status,
          assignedTo: c.assignedTo?.name || '-', created: c.createdAt
        }));
        content = JSON.stringify({ generatedAt: new Date().toISOString(), total: data.length, data: rows }, null, 2);
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
    } catch(e) { toast.error('Export failed'); }
  };

  const handleSeed = async () => {
    try {
      const data = JSON.parse(seedJson);
      const arr = Array.isArray(data) ? data : [data];
      const { seedFacilities } = await import('../api');
      const res = await seedFacilities(arr);
      setMsg(`✅ ${res.data?.message || `${arr.length} facilities seeded successfully!`}`);
    } catch(e) {
      const err = e.response?.data?.error || e.response?.data?.message || e.message;
      setMsg('❌ Invalid JSON or seed failed: ' + err);
    }
  };
  const handleSaveGlobalContacts = async () => {
    setMappingLoading(true);
    try {
      const res = await saveGlobalNotificationContacts({
        stateHead: {
          name: globalContacts.stateHeadName,
          email: globalContacts.stateHeadEmail,
          mobile: globalContacts.stateHeadMobile
        },
        opsManager: {
          name: globalContacts.opsManagerName,
          email: globalContacts.opsManagerEmail,
          mobile: globalContacts.opsManagerMobile
        }
      });
      setDirectory(res.data.directory);
      setMsg('✅ Global contacts saved successfully.');
    } catch (e) {
      setMsg('❌ Failed to save global contacts: ' + (e.response?.data?.message || e.message));
    } finally {
      setMappingLoading(false);
    }
  };
  const handleSaveFacilityMapping = async () => {
    if (!mappingForm.facilityCode) return setMsg('❌ Please select a health facility.');
    setMappingLoading(true);
    try {
      const res = await saveFacilityNotificationMapping(mappingForm.facilityCode, {
        district: mappingForm.district,
        facilityType: mappingForm.facilityType,
        facilityName: mappingForm.facilityName,
        engineer: {
          name: mappingForm.engineerName,
          email: mappingForm.engineerEmail,
          mobile: mappingForm.engineerMobile
        },
        teamLead: {
          name: mappingForm.teamLeadName,
          email: mappingForm.teamLeadEmail,
          mobile: mappingForm.teamLeadMobile
        }
      });
      setDirectory(res.data.directory);
      setMsg('✅ Facility mapping saved successfully.');
    } catch (e) {
      setMsg('❌ Failed to save facility mapping: ' + (e.response?.data?.message || e.message));
    } finally {
      setMappingLoading(false);
    }
  };
  const editMapping = (m) => {
    setMappingForm({
      district: m.district || '',
      facilityType: m.facilityType || '',
      facilityCode: m.facilityCode || '',
      facilityName: m.facilityName || '',
      engineerName: m.engineer?.name || '',
      engineerEmail: m.engineer?.email || '',
      engineerMobile: m.engineer?.mobile || '',
      teamLeadName: m.teamLead?.name || '',
      teamLeadEmail: m.teamLead?.email || '',
      teamLeadMobile: m.teamLead?.mobile || ''
    });
    setFacilityOptions(prev => {
      if ((prev || []).some(f => f.facility_code === m.facilityCode)) return prev;
      return [...(prev || []), { facility_code: m.facilityCode, facility_name: m.facilityName }];
    });
    setActiveTab('mapping');
    setMsg(`✏️ Editing mapping for ${m.facilityName}`);
  };
  const mapFacilityNow = (facility) => {
    setMappingForm(v => ({
      ...v,
      district: facility.district || '',
      facilityType: facility.facility_type || '',
      facilityCode: facility.facility_code || '',
      facilityName: facility.facility_name || ''
    }));
    setFacilityOptions(prev => {
      if ((prev || []).some(f => f.facility_code === facility.facility_code)) return prev;
      return [...(prev || []), { facility_code: facility.facility_code, facility_name: facility.facility_name }];
    });
    setActiveTab('mapping');
    setMsg(`🧩 Add mapping details for ${facility.facility_name}`);
  };

  if (!stats && complaints.length === 0) {
    return (
      <div>
        <nav className="navbar">
          <div className="navbar-inner navbar-inner-split">
            <div className="navbar-logo-slot navbar-logo-slot--left navbar-admin-left">
              <div className="hamburger-btn" style={{ visibility: 'hidden' }}>☰</div>
              <div className="skel" style={{ width: 42, height: 42, borderRadius: 8 }} />
            </div>
            <div className="navbar-brand-center">
              <div className="skel" style={{ width: 200, height: 20, margin: '0 auto' }} />
            </div>
            <div className="navbar-logo-slot navbar-logo-slot--right">
              <div className="skel" style={{ width: 42, height: 42, borderRadius: 8 }} />
              <div className="skel" style={{ width: 80, height: 32, borderRadius: 6 }} />
            </div>
          </div>
        </nav>
        <div className="form-content content-wide" style={{ flex: 1 }}>
          <div className="dashboard-metrics-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="skel" style={{ height: 100, borderRadius: 12 }} />)}
          </div>
          <div className="dashboard-charts-grid" style={{ marginTop: 24 }}>
            <div className="skel" style={{ height: 320, borderRadius: 12 }} />
            <div className="skel" style={{ height: 320, borderRadius: 12 }} />
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
          <div className="navbar-logo-slot navbar-logo-slot--left navbar-admin-left">
            <button type="button" className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
            <img src="/logos/abdm.png" alt="ABDM" className="navbar-logo-img" />
          </div>
          <div className="navbar-brand-center">
            <span className="navbar-title">डिजिटल संचार साथी</span>
            <span className="navbar-subtitle">स्वास्थ्य और संचार, हर कदम आपके साथ</span>
          </div>
          <div className="navbar-logo-slot navbar-logo-slot--right">
            <button type="button" className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀️' : '🌙'}</button>
            <img src="/logos/bsnl.png" alt="BSNL" className="navbar-logo-img" />
            <div className="navbar-actions navbar-actions--compact">
              <span className="navbar-user navbar-user--compact">{user?.name}</span>
              <span className="navbar-role navbar-role--compact">Admin</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { logoutUser(); navigate('/login'); }} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Logout</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden={!sidebarOpen} />

      {/* Mobile sidebar drawer */}
      <aside className={`sidebar-mobile ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-semibold">Menu</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(false)} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <div className="sidebar-section" style={{ paddingTop: 16 }}>
          <div className="sidebar-label">Navigation</div>
          {NAV.map(n => {
            const pending = stats?.statusStats?.find(s => s._id === 'open')?.count || 0;
            const inProg = stats?.statusStats?.find(s => s._id === 'in_progress')?.count || 0;
            const badge = n.id === 'dashboard' && pending + inProg > 0 ? pending + inProg : null;
            return (
              <div key={n.id} className={`sidebar-link ${activeTab === n.id ? 'active' : ''}`} onClick={() => { setActiveTab(n.id); setSidebarOpen(false); }}>
                <span>{n.icon}</span>{n.label}
                {badge !== null && <span className="nav-badge">{badge}</span>}
              </div>
            );
          })}
        </div>
        <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
          <div className="sidebar-link" onClick={() => { logoutUser(); navigate('/'); setSidebarOpen(false); }}>
            <span>🏠</span>Public Portal
          </div>
        </div>
      </aside>

      <div className="dashboard-layout">
        {/* Desktop Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Navigation</div>
            {NAV.map(n => {
              const pending = stats?.statusStats?.find(s => s._id === 'open')?.count || 0;
              const inProg = stats?.statusStats?.find(s => s._id === 'in_progress')?.count || 0;
              const badge = n.id === 'dashboard' && pending + inProg > 0 ? pending + inProg : null;
              return (
                <div key={n.id} className={`sidebar-link ${activeTab === n.id ? 'active' : ''}`} onClick={() => setActiveTab(n.id)}>
                  <span>{n.icon}</span>{n.label}
                  {badge !== null && <span className="nav-badge">{badge}</span>}
                </div>
              );
            })}
          </div>
          <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
            <div className="sidebar-link" onClick={() => { logoutUser(); navigate('/'); }}>
              <span>🏠</span>Public Portal
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main-content">
          {msg && <div className="alert alert-success mb-3" onClick={() => setMsg('')}>{msg} <span style={{ cursor: 'pointer', marginLeft: 'auto' }}>✕</span></div>}

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="mb-1">Dashboard</h2>
                  <p className="text-sm text-muted">Overview of your complaint management system</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => { setActiveTab('complaints'); setFilter({ status: '', district: '' }); }}>
                  View All Complaints →
                </button>
              </div>

              {/* Premium Metric Cards */}
              <div className="dashboard-metrics-grid">
                <StatCard icon="📋" value={stats?.total || 0} label="Total Complaints" subtitle="All time" color="#0F4C81" />
                <StatCard icon="🔵" value={statMap('open')} label="Open" subtitle="Awaiting action" color="#1D4ED8" />
                <StatCard icon="🟡" value={statMap('in_progress')} label="In Progress" subtitle="Being resolved" color="#B45309" />
                <StatCard icon="✅" value={stats?.resolvedTodayCount || 0} label="Resolved Today" subtitle="Past 24 hours" color="#1A7A4A" />
                <StatCard icon="👷" value={stats?.activeEngineerCount || 0} label="Active Engineers" subtitle={`${stats?.engineerCount || 0} total registered`} color="#8B5CF6" />
                <StatCard icon="🏥" value={stats?.districtStats?.length || 0} label="Active Districts" subtitle="With complaints" color="#14B8A6" />
              </div>

              {/* Charts Row */}
              {stats && (
                <div className="dashboard-charts-grid">
                  {/* Monthly Trend Bar Chart */}
                  <ChartCard
                    title="Monthly Complaint Trend"
                    subtitle="Complaints registered per month"
                  >
                    {stats.monthlyStats?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={stats.monthlyStats.map(m => ({
                          name: new Date(m._id.year, m._id.month - 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
                          Complaints: m.count
                        }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="Complaints" fill="#0F4C81" radius={[4, 4, 0, 0]} maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state" style={{ padding: '40px 24px' }}>
                        <div className="empty-title text-muted">No monthly data available yet</div>
                      </div>
                    )}
                  </ChartCard>

                  {/* Status Distribution Pie Chart */}
                  <ChartCard
                    title="Complaint Status"
                    subtitle="Breakdown by current status"
                  >
                    {stats.statusStats?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={stats.statusStats.map(s => ({
                              name: s._id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                              value: s.count,
                              status: s._id
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {stats.statusStats.map((entry, i) => (
                              <Cell key={entry._id} fill={STATUS_COLORS[entry._id] || CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            layout="horizontal"
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span className="chart-legend-text">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state" style={{ padding: '40px 24px' }}>
                        <div className="empty-title text-muted">No status data available</div>
                      </div>
                    )}
                  </ChartCard>
                </div>
              )}

              {/* District & Category Stats */}
              <div className="dashboard-secondary-grid">
                {stats?.districtStats?.length > 0 && (
                  <div className="card">
                    <div className="card-header"><span className="card-title">Top Districts</span></div>
                    <div className="card-body" style={{ padding: 0 }}>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>District</th><th>Complaints</th><th>Share</th></tr></thead>
                          <tbody>
                            {stats.districtStats.map(d => (
                              <tr key={d._id}>
                                <td className="font-semibold">{d._id}</td>
                                <td>{d.count}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ height: 6, width: `${(d.count / stats.total * 100).toFixed(0)}%`, minWidth: 4, background: 'var(--primary)', borderRadius: 3 }} />
                                    <span className="text-xs text-muted">{(d.count / stats.total * 100).toFixed(1)}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {stats?.categoryStats?.length > 0 && (
                  <div className="card">
                    <div className="card-header"><span className="card-title">Issue Categories</span></div>
                    <div className="card-body" style={{ padding: 0 }}>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Category</th><th>Count</th></tr></thead>
                          <tbody>
                            {stats.categoryStats.map((c, i) => (
                              <tr key={c._id}>
                                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                                  {c._id}
                                </td>
                                <td className="font-semibold">{c.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complaints */}
          {activeTab === 'complaints' && (
            <div>
              <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: 8 }}>
                <h2>All Complaints ({total})</h2>
                <input className="form-control" placeholder="Search..." value={filter.search || ''}
                    onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1); }}
                    style={{ width: 200, fontSize: '0.8rem' }} />
              </div>

              {/* Filters */}
              <div className="mgmt-filter-bar" style={{ padding: '12px 20px', marginBottom: 16 }}>
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
                          className={`btn btn-sm ${filter.status === val ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: 32 }}
                          onClick={() => { setFilter(f => ({ ...f, status: val })); setPage(1); }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mgmt-filter-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto', gap: 10, alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">District</label>
                    <select className="form-control" value={filter.district} onChange={e => { setFilter(f => ({ ...f, district: e.target.value })); setPage(1); }}>
                      <option value="">All</option>
                      {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={filter.priority} onChange={e => { setFilter(f => ({ ...f, priority: e.target.value })); setPage(1); }}>
                      <option value="">All</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Engineer</label>
                    <select className="form-control" value={filter.engineer} onChange={e => { setFilter(f => ({ ...f, engineer: e.target.value })); setPage(1); }}>
                      <option value="">All</option>
                      {engineers.map(eng => <option key={eng._id} value={eng._id}>{eng.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Range</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="date" className="form-control" value={filter.startDate} onChange={e => { setFilter(f => ({ ...f, startDate: e.target.value })); setPage(1); }} style={{ fontSize: '0.75rem' }} />
                      <input type="date" className="form-control" value={filter.endDate} onChange={e => { setFilter(f => ({ ...f, endDate: e.target.value })); setPage(1); }} style={{ fontSize: '0.75rem' }} />
                    </div>
                  </div>
                  <div className="mgmt-filter-clear">
                    <label className="form-label">&nbsp;</label>
                    <button className="btn btn-outline btn-sm" onClick={() => { setFilter({ status: '', district: '', priority: '', engineer: '', startDate: '', endDate: '', issueCategory: '', search: '' }); setPage(1); }} style={{ whiteSpace: 'nowrap' }}>Clear</button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Complainant</th>
                        <th>District</th>
                        <th>Facility</th>
                        <th>Issue</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.length === 0 && (
                        <tr><td colSpan={10}><div className="empty-state"><div className="empty-icon">📭</div><div className="empty-title">No complaints found</div></div></td></tr>
                      )}
                      {complaints.map(c => (
                        <tr key={c._id}>
                          <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>{c.ticketId}</span></td>
                          <td>
                            <div className="font-semibold text-sm">{c.userName}</div>
                            <div className="text-xs text-muted">{c.mobile}</div>
                          </td>
                          <td className="text-sm">{c.district}</td>
                          <td><div className="text-sm" style={{ maxWidth: 160 }}>{c.facilityName}<br /><span className="text-xs text-muted">{c.facilityType}</span></div></td>
                          <td className="text-sm" style={{ maxWidth: 140 }}>{Array.isArray(c.issueCategory) ? c.issueCategory.join(', ') : c.issueCategory}</td>
                          <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td className="text-sm">{c.assignedTo?.name || <span className="text-muted">Unassigned</span>}</td>
                          <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(c.createdAt)}</td>
                          <td>
                            <div className="action-btns">
                              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedComplaint(c); setModalData({ engineerId: c.assignedTo?._id || '' }); getEngineers().then(r => setEngineers(r.data)); setModal('assign'); }}>Assign</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedComplaint(c); setModalData({ status: c.status, notes: '', otp: '' }); setStatusAwaitingOtp(false); setModal('status'); }}>Status</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {total > 15 && (
                  <div className="flex justify-between items-center" style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-100)' }}>
                    <span className="text-sm text-muted">Page {page} of {Math.ceil(total / 15)}</span>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                      <button className="btn btn-ghost btn-sm" disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Engineers */}
          {activeTab === 'engineers' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2>Manage Users</h2>
                <button className="btn btn-primary" onClick={() => setModal('newUser')}>+ Add User</button>
              </div>
              <div className="card">
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Assigned Districts</th><th>Status</th><th>Joined</th><th style={{ width: 100 }}>Actions</th></tr></thead>
                    <tbody>
                      {users.filter(u => u.role === 'engineer' || u.role === 'management').map(u => (
                        <tr key={u._id}>
                          <td className="font-semibold">{u.name}</td>
                          <td className="text-sm text-muted">{u.email}</td>
                          <td><span className="badge badge-open">{u.role}</span></td>
                          <td className="text-sm">{u.assignedDistricts?.join(', ') || 'All districts'}</td>
                          <td><span className={`badge ${u.isActive ? 'badge-resolved' : 'badge-closed'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                          <td className="text-xs text-muted">{fmt(u.createdAt)}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => {
                                setNewUser({ name: u.name, email: u.email, password: '', role: u.role, assignedDistricts: (u.assignedDistricts || []).join(', '), _id: u._id });
                                setModal('editUser');
                              }}>✏️</button>
                              <button className="btn btn-ghost btn-sm" title="Deactivate" onClick={() => handleDeleteUser(u)} style={{ color: '#B91C1C' }}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reports */}
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
                      {['excel', 'csv', 'pdf', 'json'].map(f => (
                        <label key={f} className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                          <input type="radio" name="reportFormat" value={f}
                            checked={exportFormat === f} onChange={e => setExportFormat(e.target.value)} />
                          <span className="text-sm">{f === 'json' ? 'JSON' : f === 'excel' ? 'Excel' : f === 'csv' ? 'CSV' : 'PDF'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group mt-3">
                    <label className="form-label">Current Filter Context</label>
                    <div className="text-sm text-muted" style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 6, marginTop: 4 }}>
                      {filter.district ? `District: ${filter.district} | ` : ''}
                      {filter.status ? `Status: ${filter.status} | ` : ''}
                      {filter.priority ? `Priority: ${filter.priority} | ` : ''}
                      {filter.engineer ? `Engineer assigned | ` : ''}
                      {filter.startDate ? `From: ${filter.startDate} | ` : ''}
                      {filter.endDate ? `To: ${filter.endDate}` : ''}
                      {!filter.district && !filter.status && !filter.priority && !filter.engineer && !filter.startDate && !filter.endDate ? 'All complaints (no active filters)' : ''}
                    </div>
                  </div>
                  <button className="btn btn-primary mt-3" onClick={handleExport}>
                    ⬇ Export {exportFormat.toUpperCase()} Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Seed Facilities */}
          {activeTab === 'seed' && (
            <div>
              <h2 className="mb-2">Seed Health Facilities</h2>
              <p className="text-muted mb-3">Paste your 666 facility JSON array below to load them into the database.</p>
              <div className="card">
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Facility JSON Array</label>
                    <textarea className="form-control" rows={14} placeholder='[{"sno":1,"district":"Bokaro","facility_name":"...","facility_type":"DH","Lat ":23.61,"longitude":86.18,"facility_code":"..."}]' value={seedJson} onChange={e => setSeedJson(e.target.value)} style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }} />
                  </div>
                  <button className="btn btn-primary" onClick={handleSeed}>Upload Facilities</button>
                  {msg && <div className="alert alert-info mt-2">{msg}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Facility Notification Mapping */}
          {activeTab === 'mapping' && (
            <div>
              <h2 className="mb-2">Facility Notification Mapping</h2>
              <p className="text-muted mb-3">
                Map each health facility to its field engineer and team lead. State head and ops manager receive every complaint.
              </p>

              <div className="card mb-3">
                <div className="card-header"><span className="card-title">Always-notified Contacts</span></div>
                <div className="card-body">
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">State Head Name</label>
                      <input className="form-control" value={globalContacts.stateHeadName} onChange={e => setGlobalContacts(v => ({ ...v, stateHeadName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State Head Email</label>
                      <input className="form-control" type="email" value={globalContacts.stateHeadEmail} onChange={e => setGlobalContacts(v => ({ ...v, stateHeadEmail: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State Head Mobile</label>
                      <input className="form-control" value={globalContacts.stateHeadMobile} onChange={e => setGlobalContacts(v => ({ ...v, stateHeadMobile: e.target.value }))} />
                    </div>
                    <div />
                    <div className="form-group">
                      <label className="form-label">Ops Manager Name</label>
                      <input className="form-control" value={globalContacts.opsManagerName} onChange={e => setGlobalContacts(v => ({ ...v, opsManagerName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ops Manager Email</label>
                      <input className="form-control" type="email" value={globalContacts.opsManagerEmail} onChange={e => setGlobalContacts(v => ({ ...v, opsManagerEmail: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ops Manager Mobile</label>
                      <input className="form-control" value={globalContacts.opsManagerMobile} onChange={e => setGlobalContacts(v => ({ ...v, opsManagerMobile: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn btn-primary mt-2" onClick={handleSaveGlobalContacts} disabled={mappingLoading}>
                    {mappingLoading ? 'Saving...' : 'Save Global Contacts'}
                  </button>
                </div>
              </div>

              <div className="card mb-3">
                <div className="card-header"><span className="card-title">Map Facility to Engineer + Team Lead</span></div>
                <div className="card-body">
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">District</label>
                      <select className="form-control" value={mappingForm.district} onChange={e => setMappingForm(v => ({ ...v, district: e.target.value, facilityType: '', facilityCode: '', facilityName: '' }))}>
                        <option value="">Select district</option>
                        {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Facility Type</label>
                      <select className="form-control" value={mappingForm.facilityType} onChange={e => setMappingForm(v => ({ ...v, facilityType: e.target.value, facilityCode: '', facilityName: '' }))} disabled={!mappingForm.district}>
                        <option value="">Select type</option>
                        {facilityTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Health Facility</label>
                      <select className="form-control" value={mappingForm.facilityCode} onChange={e => {
                        const f = facilityOptions.find(x => x.facility_code === e.target.value);
                        setMappingForm(v => ({ ...v, facilityCode: e.target.value, facilityName: f?.facility_name || '' }));
                      }} disabled={!mappingForm.facilityType}>
                        <option value="">Select facility</option>
                        {facilityOptions.map(f => <option key={f.facility_code} value={f.facility_code}>{f.facility_name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Field Engineer Name</label>
                      <input className="form-control" value={mappingForm.engineerName} onChange={e => setMappingForm(v => ({ ...v, engineerName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Field Engineer Email</label>
                      <input className="form-control" type="email" value={mappingForm.engineerEmail} onChange={e => setMappingForm(v => ({ ...v, engineerEmail: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Field Engineer Mobile</label>
                      <input className="form-control" value={mappingForm.engineerMobile} onChange={e => setMappingForm(v => ({ ...v, engineerMobile: e.target.value }))} />
                    </div>
                    <div />
                    <div className="form-group">
                      <label className="form-label">Team Lead Name</label>
                      <input className="form-control" value={mappingForm.teamLeadName} onChange={e => setMappingForm(v => ({ ...v, teamLeadName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Team Lead Email</label>
                      <input className="form-control" type="email" value={mappingForm.teamLeadEmail} onChange={e => setMappingForm(v => ({ ...v, teamLeadEmail: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Team Lead Mobile</label>
                      <input className="form-control" value={mappingForm.teamLeadMobile} onChange={e => setMappingForm(v => ({ ...v, teamLeadMobile: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn btn-primary mt-2" onClick={handleSaveFacilityMapping} disabled={mappingLoading || !mappingForm.facilityCode}>
                    {mappingLoading ? 'Saving...' : 'Save Facility Mapping'}
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Current Mappings</span></div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Facility</th>
                        <th>Engineer</th>
                        <th>Team Lead</th>
                        <th>Updated</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(directory?.mappings || []).length === 0 && (
                        <tr><td colSpan={5}><div className="empty-state"><div className="empty-title">No mappings yet</div></div></td></tr>
                      )}
                      {visibleMappedRows.map(m => (
                        <tr key={m.facilityCode}>
                          <td>
                            <div className="font-semibold text-sm">{m.facilityName}</div>
                            <div className="text-xs text-muted">{m.district} · {m.facilityType} · {m.facilityCode}</div>
                          </td>
                          <td className="text-sm">
                            <div>{m.engineer?.name || '-'}</div>
                            <div className="text-xs text-muted">{m.engineer?.email || '-'}</div>
                            <div className="text-xs text-muted">{m.engineer?.mobile || '-'}</div>
                          </td>
                          <td className="text-sm">
                            <div>{m.teamLead?.name || '-'}</div>
                            <div className="text-xs text-muted">{m.teamLead?.email || '-'}</div>
                            <div className="text-xs text-muted">{m.teamLead?.mobile || '-'}</div>
                          </td>
                          <td className="text-xs text-muted">{fmt(m.updatedAt)}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => editMapping(m)}>Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mappedRows.length > MAPPING_PAGE_SIZE && (
                  <div className="flex justify-between items-center" style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-100)' }}>
                    <span className="text-sm text-muted">Showing {(mappingPage - 1) * MAPPING_PAGE_SIZE + 1}–{Math.min(mappingPage * MAPPING_PAGE_SIZE, mappedRows.length)} of {mappedRows.length}</span>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" disabled={mappingPage === 1} onClick={() => setMappingPage(p => p - 1)}>← Prev</button>
                      <button className="btn btn-ghost btn-sm" disabled={mappingPage >= mappingPages} onClick={() => setMappingPage(p => p + 1)}>Next →</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unmapped Facilities */}
          {activeTab === 'unmapped' && (
            <div>
              <h2 className="mb-2">Unmapped Health Facilities</h2>
              <p className="text-muted mb-3">Facilities listed here do not have field engineer/team lead mapping yet.</p>
              <div className="card">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>District</th>
                        <th>Facility Type</th>
                        <th>Facility</th>
                        <th>Facility Code</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmappedRows.length === 0 && (
                        <tr><td colSpan={5}><div className="empty-state"><div className="empty-title">All facilities are mapped 🎉</div></div></td></tr>
                      )}
                      {visibleUnmappedRows.map(f => (
                        <tr key={f.facility_code}>
                          <td className="text-sm">{f.district}</td>
                          <td className="text-sm">{f.facility_type}</td>
                          <td className="text-sm font-semibold">{f.facility_name}</td>
                          <td className="text-xs text-muted">{f.facility_code}</td>
                          <td><button className="btn btn-ghost btn-sm" onClick={() => mapFacilityNow(f)}>Map Now</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {unmappedRows.length > MAPPING_PAGE_SIZE && (
                  <div className="flex justify-between items-center" style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-100)' }}>
                    <span className="text-sm text-muted">Showing {(unmappedPage - 1) * MAPPING_PAGE_SIZE + 1}–{Math.min(unmappedPage * MAPPING_PAGE_SIZE, unmappedRows.length)} of {unmappedRows.length}</span>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" disabled={unmappedPage === 1} onClick={() => setUnmappedPage(p => p - 1)}>← Prev</button>
                      <button className="btn btn-ghost btn-sm" disabled={unmappedPage >= unmappedPages} onClick={() => setUnmappedPage(p => p + 1)}>Next →</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{confirmAction.title}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmAction(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm">{confirmAction.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmAction.onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {modal === 'assign' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Engineer</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted mb-2">Ticket: <strong>{selectedComplaint?.ticketId}</strong></p>
              <div className="form-group">
                <label className="form-label">Select Engineer</label>
                <select className="form-control" value={modalData.engineerId} onChange={e => setModalData(d => ({ ...d, engineerId: e.target.value }))}>
                  <option value="">-- Select Engineer --</option>
                  {engineers.map(e => <option key={e._id} value={e._id}>{e.name} ({e.assignedDistricts?.join(', ') || 'All'})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={loading || !modalData.engineerId}>
                {loading ? <span className="spinner" /> : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {modal === 'status' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Status</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted mb-2">Ticket: <strong>{selectedComplaint?.ticketId}</strong></p>
              {selectedComplaint?.attachmentUrls?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-muted font-semibold mb-1">Attachments</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedComplaint.attachmentUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--gray-200)' }} /></a>
                    ))}
                  </div>
                </div>
              )}
              {statusAwaitingOtp ? (
                <>
                  <div className="alert alert-info mb-3">
                    OTP has been sent to <strong>{selectedComplaint?.email}</strong>. Ask the complainant for the 6-digit code and enter it below.
                  </div>
                  <div className="form-group">
                    <label className="form-label">Enter OTP from Complainant</label>
                    <input className="form-control" placeholder="e.g. 123456" maxLength={6} value={modalData.otp || ''} onChange={e => setModalData(d => ({ ...d, otp: e.target.value.replace(/\D/g, '') }))} style={{ fontFamily: 'var(--mono)', letterSpacing: '0.2em', fontSize: '1.2rem' }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">New Status</label>
                    <select className="form-control" value={modalData.status} onChange={e => setModalData(d => ({ ...d, status: e.target.value }))}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={modalData.priority || ''} onChange={e => setModalData(d => ({ ...d, priority: e.target.value }))}>
                      <option value="">No change</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={3} placeholder="Resolution notes or update..." value={modalData.notes} onChange={e => setModalData(d => ({ ...d, notes: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(null); setStatusAwaitingOtp(false); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStatus} disabled={loading || (statusAwaitingOtp && (modalData.otp || '').length !== 6)}>
                {loading ? <span className="spinner" /> : statusAwaitingOtp ? '✓ Confirm Resolution' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {modal === 'newUser' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New User</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {['name', 'email', 'password'].map(field => (
                <div className="form-group" key={field}>
                  <label className="form-label" style={{ textTransform: 'capitalize' }}>{field}</label>
                  <input className="form-control" type={field === 'password' ? 'password' : 'text'} value={newUser[field]} onChange={e => setNewUser(u => ({ ...u, [field]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                  <option value="engineer">Engineer</option>
                  <option value="admin">Admin</option>
                  <option value="management">Management (View Only)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Districts</label>
                <input className="form-control" placeholder="e.g. Bokaro, Dhanbad (comma separated)" value={newUser.assignedDistricts} onChange={e => setNewUser(u => ({ ...u, assignedDistricts: e.target.value }))} />
                <div className="form-hint">Leave empty to allow access to all districts</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleNewUser} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {modal === 'editUser' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-control" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" value={newUser.email} disabled style={{ background: '#F1F5F9' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-control" value={newUser.role} disabled style={{ background: '#F1F5F9' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Districts</label>
                <input className="form-control" placeholder="e.g. Bokaro, Dhanbad (comma separated)" value={newUser.assignedDistricts} onChange={e => setNewUser(u => ({ ...u, assignedDistricts: e.target.value }))} />
                <div className="form-hint">Leave empty to allow access to all districts</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(null); setNewUser({ name: '', email: '', password: '', role: 'engineer', assignedDistricts: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditUser} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
