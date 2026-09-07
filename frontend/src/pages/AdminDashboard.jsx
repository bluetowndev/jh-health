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
  saveFacilityNotificationMapping,
  getTeamLeads,
  escapeHtml
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import MaterialIcon from '../components/MaterialIcon';
import useTheme from '../hooks/useTheme';
import { useLogoutConfirm } from '../hooks/useLogoutConfirm';
import GlassSelect from '../components/GlassSelect';
import GlassDatePicker from '../components/GlassDatePicker';
import { STATUS_COLORS, CHART_COLORS } from '../utils/constants';
import { fmt } from '../utils/dates';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'complaints', label: 'All Complaints', icon: 'assignment' },
  { id: 'engineers', label: 'Manage Users', icon: 'group' },
  { id: 'mapping', label: 'Facility Mapping', icon: 'settings_input_antenna' },
  { id: 'unmapped', label: 'Unmapped Facilities', icon: 'explore' },
  { id: 'reports', label: 'Reports', icon: 'trending_up' },
  { id: 'seed', label: 'Seed Facilities', icon: 'local_hospital' },
];

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

export default function AdminDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { confirmLogout, LogoutConfirmModal } = useLogoutConfirm();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [engineers, setEngineers] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamLeadsList, setTeamLeadsList] = useState([]);
  const [filter, setFilter] = useState({ status: '', district: '', priority: '', engineer: '', startDate: '', endDate: '', issueCategory: '', search: '' });
  const [page, setPage] = useState(1);
  const [exportFormat, setExportFormat] = useState('excel');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modal, setModal] = useState(null); // 'assign' | 'status' | 'newUser' | 'editUser'
  const [modalData, setModalData] = useState({});
  const [statusAwaitingOtp, setStatusAwaitingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'engineer', assignedDistricts: '', teamLeadId: '' });
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
  const searchTimerRef = useRef(null);
  const [localSearch, setLocalSearch] = useState('');
  const loadDistricts = useCallback(() => {
    if (districtsCache.current) { setDistrictOptions(districtsCache.current); return; }
    getDistricts().then(r => { districtsCache.current = r.data || []; setDistrictOptions(districtsCache.current); }).catch(() => { toast.error('Failed to load districts'); });
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
    getEngineers().then(r => setEngineers(r.data)).catch(() => { toast.error('Failed to load engineers'); });
  }, [user]);

  useEffect(() => { if (activeTab === 'complaints') loadComplaints(); }, [activeTab, filter, page]);
  useEffect(() => { if (activeTab === 'complaints') { loadDistricts(); } }, [activeTab]);
  useEffect(() => { if (activeTab === 'engineers') { getUsers().then(r => setUsers(r.data)).catch(() => { toast.error('Failed to load users'); }); getTeamLeads().then(r => setTeamLeadsList(r.data)).catch(() => { toast.error('Failed to load team leads'); }); } }, [activeTab]);
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
      }).catch(() => {});
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

  const loadStats = () => getComplaintStats().then(r => setStats(r.data)).catch(() => { toast.error('Failed to load stats'); });
  const loadComplaints = useCallback(() => {
    getComplaints({ ...filter, page, limit: 15 }).then(r => { setComplaints(r.data.complaints); setTotal(r.data.total); }).catch(() => { toast.error('Failed to load complaints'); });
  }, [filter, page]);

  const statMap = (key) => stats?.statusStats?.find(s => s._id === key)?.count || 0;
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
      await registerUser({ ...newUser, assignedDistricts: newUser.assignedDistricts.split(',').map(s => s.trim()).filter(Boolean), teamLeadId: newUser.teamLeadId || undefined });
      setModal(null); toast.success('User created');
      getUsers().then(r => setUsers(r.data)).catch(() => {});
      setNewUser({ name: '', email: '', password: '', role: 'engineer', assignedDistricts: '', teamLeadId: '' });
    } catch(e) { toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleEditUser = async () => {
    setLoading(true);
    try {
      await updateUser(newUser._id, {
        name: newUser.name,
        assignedDistricts: newUser.assignedDistricts.split(',').map(s => s.trim()).filter(Boolean),
        teamLeadId: newUser.teamLeadId || null
      });
      setModal(null); toast.success('User updated');
      getUsers().then(r => setUsers(r.data)).catch(() => {});
      setNewUser({ name: '', email: '', password: '', role: 'engineer', assignedDistricts: '', teamLeadId: '' });
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
          getUsers().then(r => setUsers(r.data)).catch(() => {});
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
<table><thead><tr><th>Ticket ID</th><th>Complainant</th><th>District</th><th>Facility</th><th>Issue</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Created</th></tr></thead><tbody>
${data.map(c => `<tr><td>${escapeHtml(c.ticketId)}</td><td>${escapeHtml(c.userName)}</td><td>${escapeHtml(c.district)}</td><td>${escapeHtml(c.facilityName)}</td><td>${escapeHtml((c.issueCategory || []).join('; '))}</td><td>${escapeHtml(c.priority)}</td><td>${escapeHtml(c.status)}</td><td>${escapeHtml(c.assignedTo?.name || '-')}</td><td>${fmtDate(c.createdAt)}</td></tr>`).join('')}
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
        xml += '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${escapeHtml(h)}</Data></Cell>`).join('') + '</Row>';
        rows.forEach(r => {
          xml += '<Row>' + r.map(v => `<Cell><Data ss:Type="String">${escapeHtml(String(v ?? ''))}</Data></Cell>`).join('') + '</Row>';
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
      setMsg(res.data?.message || `${arr.length} facilities seeded successfully!`);
    } catch(e) {
      const err = e.response?.data?.error || e.response?.data?.message || e.message;
      setMsg('Invalid JSON or seed failed: ' + err);
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
      setMsg('Global contacts saved successfully.');
    } catch (e) {
      setMsg('Failed to save global contacts: ' + (e.response?.data?.message || e.message));
    } finally {
      setMappingLoading(false);
    }
  };
  const handleSaveFacilityMapping = async () => {
    if (!mappingForm.facilityCode) return setMsg('Please select a health facility.');
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
      setMsg('Facility mapping saved successfully.');
    } catch (e) {
      setMsg('Failed to save facility mapping: ' + (e.response?.data?.message || e.message));
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
    setMsg(`Editing mapping for ${m.facilityName}`);
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
    setMsg(`Add mapping details for ${facility.facility_name}`);
  };

  if (!stats && complaints.length === 0) {
    return (
      <div>
        <nav className="navbar glass-navbar">
          <div className="navbar-inner navbar-inner-split">
            <div className="navbar-logo-slot navbar-logo-slot--left navbar-admin-left">
              <div className="hamburger-btn" style={{ visibility: 'hidden' }}><MaterialIcon name="menu" size={24} /></div>
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
              <span className="navbar-role navbar-role--compact">Admin</span>
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
          <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(false)} style={{ padding: '4px 8px' }}><MaterialIcon name="close" size={20} /></button>
        </div>
        <div className="sidebar-section" style={{ paddingTop: 16 }}>
          <div className="sidebar-label">Navigation</div>
          {NAV.map(n => {
            const pending = stats?.statusStats?.find(s => s._id === 'open')?.count || 0;
            const inProg = stats?.statusStats?.find(s => s._id === 'in_progress')?.count || 0;
            const badge = n.id === 'dashboard' && pending + inProg > 0 ? pending + inProg : null;
            return (
              <div key={n.id} className={`sidebar-link material-nav-item ${activeTab === n.id ? 'active' : ''}`} role="link" tabIndex={0} onClick={() => { setActiveTab(n.id); setSidebarOpen(false); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(n.id); setSidebarOpen(false); } }}>
                <MaterialIcon name={n.icon} size={20} />{n.label}
                {badge !== null && <span className="nav-badge">{badge}</span>}
              </div>
            );
          })}
        </div>
          <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
          <div className="sidebar-link material-nav-item" role="link" tabIndex={0} onClick={() => { window.open('/', '_blank'); setSidebarOpen(false); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open('/', '_blank'); setSidebarOpen(false); } }}>
            <MaterialIcon name="home" size={20} />Public Portal
          </div>
          <div className="sidebar-link material-nav-item" role="link" tabIndex={0}
            onClick={toggleTheme}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); } }}>
            <MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} /> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </div>
          <div className="sidebar-link material-nav-item" role="link" tabIndex={0} onClick={confirmLogout} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmLogout(); } }}>
            <MaterialIcon name="logout" size={20} />Logout
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
                <div key={n.id} className={`sidebar-link material-nav-item ${activeTab === n.id ? 'active' : ''}`} role="link" tabIndex={0} onClick={() => setActiveTab(n.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(n.id); } }}>
                  <MaterialIcon name={n.icon} size={20} />{n.label}
                  {badge !== null && <span className="nav-badge">{badge}</span>}
                </div>
              );
            })}
          </div>
          <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0} onClick={() => window.open('/', '_blank')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open('/', '_blank'); } }}>
              <MaterialIcon name="home" size={20} />Public Portal
            </div>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0}
              onClick={toggleTheme}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); } }}>
              <MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} /> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </div>
            <div className="sidebar-link material-nav-item" role="link" tabIndex={0} onClick={confirmLogout} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmLogout(); } }}>
              <MaterialIcon name="logout" size={20} />Logout
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main-content">
          {msg && <div className={`alert ${msg.toLowerCase().startsWith('failed') || msg.toLowerCase().startsWith('invalid') ? 'alert-danger' : 'alert-success'} mb-3`} onClick={() => setMsg('')}>{msg} <span style={{ cursor: 'pointer', marginLeft: 'auto' }}><MaterialIcon name="close" size={14} /></span></div>}

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Dashboard</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Overview of your complaint management system</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => { setActiveTab('complaints'); setFilter({ status: '', district: '', priority: '', engineer: '', startDate: '', endDate: '', issueCategory: '', search: '' }); setLocalSearch(''); }} style={{ borderRadius: 6 }}>
                  View All Complaints →
                </button>
              </div>

              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { icon: 'assignment', value: stats?.total || 0, label: 'Total Complaints', sub: 'All time', color: '#0F4C81' },
                  { icon: 'radio_button_checked', value: statMap('open'), label: 'Open', sub: 'Awaiting action', color: '#1D4ED8' },
                  { icon: 'pending', value: statMap('in_progress'), label: 'In Progress', sub: 'Being resolved', color: '#B45309' },
                  { icon: 'check_circle', value: stats?.resolvedTodayCount || 0, label: 'Resolved Today', sub: 'Past 24 hours', color: '#1A7A4A' },
                  { icon: 'engineering', value: stats?.activeEngineerCount || 0, label: 'Active Engineers', sub: `${stats?.engineerCount || 0} total registered`, color: '#8B5CF6' },
                  { icon: 'local_hospital', value: stats?.districtStats?.length || 0, label: 'Active Districts', sub: 'With complaints', color: '#14B8A6' },
                ].map((item, i) => (
                  <div key={i} className="card hover-lift glass-card material-kpi" style={{ padding: '16px 14px', borderTop: `3px solid ${item.color}`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -12, right: -12, width: 80, height: 80, borderRadius: '50%', background: item.color + '0A', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color, lineHeight: 1.2, marginTop: 4 }}>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</div>
                        {item.sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>}
                      </div>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}><MaterialIcon name={item.icon} size={24} /></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              {stats && (
                <div className="responsive-grid-2" style={{ marginBottom: 24 }}>
                  <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Monthly Complaint Trend</h3>
                    {stats.monthlyStats?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={stats.monthlyStats.map(m => ({
                          name: new Date(m._id.year, m._id.month - 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
                          Complaints: m.count
                        }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="Complaints" fill="#0F4C81" radius={[4, 4, 0, 0]} maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}><MaterialIcon name="bar_chart" size={48} color="var(--gray-300)" /></div>
                        <div style={{ fontSize: '0.85rem' }}>No monthly data available yet</div>
                      </div>
                    )}
                  </div>

                  <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Complaint Status</h3>
                    {stats.statusStats?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
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
                            outerRadius={85}
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
                      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}><MaterialIcon name="bar_chart" size={48} color="var(--gray-300)" /></div>
                        <div style={{ fontSize: '0.85rem' }}>No status data available</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* District & Category Stats */}
              <div className="responsive-grid-2">
                {stats?.districtStats?.length > 0 && (
                  <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>Top Districts</h3>
                    </div>
                    <div style={{ padding: 0 }}>
                      <table className="material-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>District</th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Complaints</th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.districtStats.map(d => (
                            <tr key={d._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d._id}</td>
                              <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d.count}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ height: 6, width: `${(d.count / stats.total * 100).toFixed(0)}%`, minWidth: 4, background: 'var(--primary)', borderRadius: 3 }} />
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(d.count / stats.total * 100).toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {stats?.categoryStats?.length > 0 && (
                  <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>Issue Categories</h3>
                    </div>
                    <div style={{ padding: 0 }}>
                      <table className="material-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.categoryStats.map((c, i) => (
                            <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                                {c._id}
                              </td>
                              <td style={{ padding: '10px 16px', fontWeight: 600 }}>{c.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complaints */}
          {activeTab === 'complaints' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>All Complaints ({total})</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage and assign complaints across all districts</p>
              </div>

              {/* Filters */}
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
                        className={`btn btn-sm ${filter.status === val ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '5px 14px', fontSize: '0.78rem', borderRadius: 6 }}
                        onClick={() => { setFilter(f => ({ ...f, status: val })); setPage(1); }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className="form-control" placeholder="Search ticket, facility..." value={localSearch}
                    onChange={e => { const val = e.target.value; setLocalSearch(val); clearTimeout(searchTimerRef.current); searchTimerRef.current = setTimeout(() => { setFilter(f => ({ ...f, search: val })); setPage(1); }, 300); }}
                    style={{ flex: '1 1 180px', fontSize: '0.85rem' }} />
                  <div style={{ flex: '1 1 130px' }}>
                    <GlassSelect
                      value={filter.district}
                      onChange={v => { setFilter(f => ({ ...f, district: v })); setPage(1); }}
                      options={districtOptions.map(d => ({ value: d, label: d }))}
                      placeholder="All Districts"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ flex: '1 1 130px' }}>
                    <GlassSelect
                      value={filter.priority}
                      onChange={v => { setFilter(f => ({ ...f, priority: v })); setPage(1); }}
                      options={[
                        { value: '', label: 'All Priority' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                      placeholder="All Priority"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ flex: '1 1 130px' }}>
                    <GlassSelect
                      value={filter.engineer}
                      onChange={v => { setFilter(f => ({ ...f, engineer: v })); setPage(1); }}
                      options={engineers.map(eng => ({ value: eng._id, label: eng.name }))}
                      placeholder="All Engineers"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ flex: '1 1 120px' }}>
                    <GlassDatePicker
                      value={filter.startDate}
                      onChange={v => { setFilter(f => ({ ...f, startDate: v })); setPage(1); }}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ flex: '1 1 120px' }}>
                    <GlassDatePicker
                      value={filter.endDate}
                      onChange={v => { setFilter(f => ({ ...f, endDate: v })); setPage(1); }}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => { setFilter({ status: '', district: '', priority: '', engineer: '', startDate: '', endDate: '', issueCategory: '', search: '' }); setLocalSearch(''); setPage(1); }} style={{ fontSize: '0.78rem' }}>Clear</button>
                </div>
              </div>

              <div className="card">
                {/* Mobile Card View */}
                {complaints.length === 0 ? (
                  <div className="mobile-complaint-card" style={{ padding: '48px 24px' }}>
                    <EmptyState
                      icon="inbox"
                      title="No complaints found"
                      description="No complaints match the current filters. Try adjusting your search criteria."
                      action={
                        <button className="btn btn-outline btn-sm" onClick={() => { setFilter({ status: '', district: '', priority: '', engineer: '', startDate: '', endDate: '', issueCategory: '', search: '' }); setLocalSearch(''); setPage(1); }}>
                          Clear Filters
                        </button>
                      }
                    />
                  </div>
                ) : (
                  complaints.map(c => (
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
                          <button className="btn btn-outline btn-xs" onClick={() => { setSelectedComplaint(c); setModalData({ engineerId: c.assignedTo?._id || '' }); getEngineers().then(r => setEngineers(r.data)).catch(() => {}); setModal('assign'); }}>Assign</button>
                          <button className="btn btn-primary btn-xs" onClick={() => { setSelectedComplaint(c); setModalData({ status: c.status, notes: '', otp: '' }); setStatusAwaitingOtp(false); setModal('status'); }}>Status</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Desktop Table View */}
                <div className="table-scroll-wrapper swipe-hint">
                  <div className="table-wrapper">
                    <table className="material-table">
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
                        <tr><td colSpan={10}>
                          <EmptyState
                            icon="inbox"
                            title="No complaints found"
                            description="No complaints match the current filters. Try adjusting your search criteria."
                          />
                        </td></tr>
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
                              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedComplaint(c); setModalData({ engineerId: c.assignedTo?._id || '' }); getEngineers().then(r => setEngineers(r.data)).catch(() => {}); setModal('assign'); }}>Assign</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedComplaint(c); setModalData({ status: c.status, notes: '', otp: '' }); setStatusAwaitingOtp(false); setModal('status'); }}>Status</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
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
              <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Manage Users</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Create, edit, and manage user accounts</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModal('newUser')} style={{ borderRadius: 6 }}>+ Add User</button>
              </div>
              <div className="card">
                <div className="table-wrapper">
                  <table className="material-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Team Lead</th><th>Assigned Districts</th><th>Status</th><th>Joined</th><th style={{ width: 100 }}>Actions</th></tr></thead>
                    <tbody>
                      {users.filter(u => u.role === 'engineer' || u.role === 'management' || u.role === 'teamLead').map(u => {
                        const tl = u.teamLeadId ? teamLeadsList.find(t => t._id === u.teamLeadId) : null;
                        return (
                        <tr key={u._id}>
                          <td className="font-semibold">{u.name}</td>
                          <td className="text-sm text-muted">{u.email}</td>
                          <td><span className="badge badge-open">{u.role}</span></td>
                          <td className="text-sm">{u.role === 'engineer' ? (tl ? `${tl.name}` : <span className="text-muted">None</span>) : '-'}</td>
                          <td className="text-sm">{u.assignedDistricts?.join(', ') || 'All districts'}</td>
                          <td><span className={`badge ${u.isActive ? 'badge-resolved' : 'badge-closed'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                          <td className="text-xs text-muted">{fmt(u.createdAt)}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => {
                                setNewUser({ name: u.name, email: u.email, password: '', role: u.role, assignedDistricts: (u.assignedDistricts || []).join(', '), teamLeadId: u.teamLeadId || '', _id: u._id });
                                setModal('editUser');
                              }}><MaterialIcon name="edit" size={16} /></button>
                              <button className="btn btn-ghost btn-sm" title="Deactivate" onClick={() => handleDeleteUser(u)} style={{ color: '#B91C1C' }}><MaterialIcon name="delete" size={16} /></button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reports */}
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
                      { val: 'csv', label: 'CSV', icon: 'description', color: '#3b82f6' },
                      { val: 'pdf', label: 'PDF', icon: 'feed', color: '#ef4444' },
                      { val: 'json', label: 'JSON', icon: 'code', color: '#8b5cf6' },
                    ].map(({ val, label, icon, color }) => (
                      <button key={val} type="button"
                        onClick={() => setExportFormat(val)}
                        className="material-export-card"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 20px', borderRadius: 10, border: `2px solid ${exportFormat === val ? color : 'var(--border-color)'}`, background: exportFormat === val ? color + '10' : 'transparent', cursor: 'pointer', transition: 'all 0.2s', minWidth: 80 }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = color}
                        onMouseLeave={e => { if (exportFormat !== val) e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                        <MaterialIcon name={icon} size={24} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: exportFormat === val ? color : 'var(--text-primary)' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Filter Context</label>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8, lineHeight: 1.6 }}>
                    {filter.district && <span style={{ display: 'inline-block', background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>District: {filter.district}</span>}
                    {filter.status && <span style={{ display: 'inline-block', background: '#f0fdf4', color: '#1A7A4A', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>Status: {filter.status}</span>}
                    {filter.priority && <span style={{ display: 'inline-block', background: '#fff7ed', color: '#E8741A', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>Priority: {filter.priority}</span>}
                    {filter.engineer && <span style={{ display: 'inline-block', background: '#f5f3ff', color: '#7C3AED', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>Engineer assigned</span>}
                    {filter.startDate && <span style={{ display: 'inline-block', background: '#fdf2f8', color: '#EC4899', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>From: {filter.startDate}</span>}
                    {filter.endDate && <span style={{ display: 'inline-block', background: '#fef3c7', color: '#B45309', padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 4 }}>To: {filter.endDate}</span>}
                    {!filter.district && !filter.status && !filter.priority && !filter.engineer && !filter.startDate && !filter.endDate && <span style={{ color: 'var(--text-muted)' }}>All complaints (no active filters)</span>}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleExport} style={{ padding: '10px 24px', borderRadius: 8 }}>
                  <MaterialIcon name="download" size={18} /> Export {exportFormat.toUpperCase()} Report
                </button>
              </div>
            </div>
          )}

          {/* Seed Facilities */}
          {activeTab === 'seed' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Seed Health Facilities</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Paste your 666 facility JSON array below to load them into the database</p>
              </div>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Facility JSON Array</label>
                  <textarea className="form-control" rows={14} placeholder='[{"sno":1,"district":"Bokaro","facility_name":"...","facility_type":"DH","Lat ":23.61,"longitude":86.18,"facility_code":"..."}]' value={seedJson} onChange={e => setSeedJson(e.target.value)} style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }} />
                </div>
                <button className="btn btn-primary" onClick={handleSeed} style={{ borderRadius: 6 }}>Upload Facilities</button>
                {msg && <div className="alert alert-info mt-2">{msg}</div>}
              </div>
            </div>
          )}

          {/* Facility Notification Mapping */}
          {activeTab === 'mapping' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Facility Notification Mapping</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Map each health facility to its field engineer and team lead. State head and ops manager receive every complaint.</p>
              </div>

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
                      <GlassSelect
                        value={mappingForm.district}
                        onChange={v => setMappingForm(v2 => ({ ...v2, district: v, facilityType: '', facilityCode: '', facilityName: '' }))}
                        options={districtOptions.map(d => ({ value: d, label: d }))}
                        placeholder="Select district"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Facility Type</label>
                      <GlassSelect
                        value={mappingForm.facilityType}
                        onChange={v => setMappingForm(v2 => ({ ...v2, facilityType: v, facilityCode: '', facilityName: '' }))}
                        options={facilityTypeOptions.map(t => ({ value: t, label: t }))}
                        placeholder="Select type"
                        disabled={!mappingForm.district}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Health Facility</label>
                      <GlassSelect
                        value={mappingForm.facilityCode}
                        onChange={v => {
                          const f = facilityOptions.find(x => x.facility_code === v);
                          setMappingForm(v2 => ({ ...v2, facilityCode: v, facilityName: f?.facility_name || '' }));
                        }}
                        options={facilityOptions.map(f => ({ value: f.facility_code, label: f.facility_name }))}
                        placeholder="Select facility"
                        disabled={!mappingForm.facilityType}
                      />
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
                  <table className="material-table">
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
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Unmapped Health Facilities</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Facilities listed here do not have field engineer/team lead mapping yet</p>
              </div>
              <div className="card">
                <div className="table-wrapper">
                  <table className="material-table">
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
                        <tr><td colSpan={5}><div className="empty-state"><div className="empty-title">All facilities are mapped</div></div></td></tr>
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
        <div className="modal-overlay" onClick={() => setConfirmAction(null)} onKeyDown={e => { if (e.key === 'Escape') setConfirmAction(null); }}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{confirmAction.title}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmAction(null)}><MaterialIcon name="close" size={16} /></button>
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
        <div className="modal-overlay" onClick={() => setModal(null)} onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Engineer</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><MaterialIcon name="close" size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted mb-2">Ticket: <strong>{selectedComplaint?.ticketId}</strong></p>
              <div className="form-group">
                <label className="form-label">Select Engineer</label>
                <GlassSelect
                  value={modalData.engineerId}
                  onChange={v => setModalData(d => ({ ...d, engineerId: v }))}
                  options={engineers.map(e => ({ value: e._id, label: `${e.name} (${e.assignedDistricts?.join(', ') || 'All'})` }))}
                  placeholder="-- Select Engineer --"
                />
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
        <div className="modal-overlay" onClick={() => setModal(null)} onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Status</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><MaterialIcon name="close" size={16} /></button>
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
                    <GlassSelect
                      value={modalData.status}
                      onChange={v => setModalData(d => ({ ...d, status: v }))}
                      options={[
                        { value: 'open', label: 'Open' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'resolved', label: 'Resolved' },
                        { value: 'closed', label: 'Closed' },
                      ]}
                      placeholder="Select status"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <GlassSelect
                      value={modalData.priority || ''}
                      onChange={v => setModalData(d => ({ ...d, priority: v }))}
                      options={[
                        { value: '', label: 'No change' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                      placeholder="No change"
                    />
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
        <div className="modal-overlay" onClick={() => setModal(null)} onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New User</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><MaterialIcon name="close" size={16} /></button>
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
                <GlassSelect
                  value={newUser.role}
                  onChange={v => setNewUser(u => ({ ...u, role: v }))}
                  options={[
                    { value: 'engineer', label: 'Engineer' },
                    { value: 'teamLead', label: 'Team Lead' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'management', label: 'Management (View Only)' },
                  ]}
                  placeholder="Select role"
                />
              </div>
              {newUser.role === 'engineer' && (
                <div className="form-group">
                  <label className="form-label">Team Lead</label>
                  <GlassSelect
                    value={newUser.teamLeadId}
                    onChange={v => setNewUser(u => ({ ...u, teamLeadId: v }))}
                    options={teamLeadsList.map(tl => ({ value: tl._id, label: `${tl.name} (${tl.email})` }))}
                    placeholder="None"
                  />
                  <div className="form-hint">Assign this engineer to a team lead</div>
                </div>
              )}
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
        <div className="modal-overlay" onClick={() => setModal(null)} onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><MaterialIcon name="close" size={16} /></button>
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
              {newUser.role === 'engineer' && (
                <div className="form-group">
                  <label className="form-label">Team Lead</label>
                  <GlassSelect
                    value={newUser.teamLeadId || ''}
                    onChange={v => setNewUser(u => ({ ...u, teamLeadId: v }))}
                    options={teamLeadsList.map(tl => ({ value: tl._id, label: `${tl.name} (${tl.email})` }))}
                    placeholder="None"
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Assigned Districts</label>
                <input className="form-control" placeholder="e.g. Bokaro, Dhanbad (comma separated)" value={newUser.assignedDistricts} onChange={e => setNewUser(u => ({ ...u, assignedDistricts: e.target.value }))} />
                <div className="form-hint">Leave empty to allow access to all districts</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(null); setNewUser({ name: '', email: '', password: '', role: 'engineer', assignedDistricts: '', teamLeadId: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditUser} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {LogoutConfirmModal}
    </div>
  );
}
