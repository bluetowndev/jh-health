export const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

export const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

export const STATUS_COLORS = {
  open: '#1D4ED8',
  in_progress: '#B45309',
  resolved: '#1A7A4A',
  closed: '#64748B',
};

export const CHART_COLORS = ['#0F4C81', '#E8741A', '#1A7A4A', '#B45309', '#7C3AED', '#EC4899', '#14B8A6', '#F59E0B'];

export const PIE_COLORS = ['#1D4ED8', '#B45309', '#1A7A4A', '#64748B'];

export const DISTRICT_COLORS = {
  'Ranchi': '#0F4C81', 'Hazaribag': '#E8741A', 'Dhanbad': '#1A7A4A', 'Giridih': '#B45309',
  'Bokaro': '#7C3AED', 'Deoghar': '#EC4899', 'Godda': '#14B8A6', 'Dumka': '#F59E0B',
  'Palamu': '#6366F1', 'Latehar': '#0EA5E9', 'Gumla': '#84CC16', 'Lohardaga': '#E11D48',
  'Simdega': '#7C3AED', 'Khunti': '#0891B2', 'Seraikela': '#65A30D', 'Chaibasa': '#C026D3',
  'West Singhbhum': '#2563EB', 'East Singhbhum': '#D97706', 'Ramgarh': '#059669',
  'Koderma': '#DC2626', 'Chatra': '#7C3AED', 'Jamtara': '#0284C7', 'Sahebganj': '#CA8A04',
  'Pakur': '#9333EA',
};

export const NAV_ITEMS = {
  admin: [
    { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
    { label: 'Engineers', path: '/admin?tab=engineers', icon: 'engineering' },
    { label: 'Mapping', path: '/admin?tab=mapping', icon: 'map' },
    { label: 'Reports', path: '/admin?tab=reports', icon: 'trending_up' },
    { label: 'Seed Data', path: '/admin?tab=seed', icon: 'database' }
  ],
  management: [
    { label: 'Dashboard', path: '/management', icon: 'dashboard' },
    { label: 'Complaints', path: '/management?tab=complaints', icon: 'assignment' }
  ],
  teamLead: [
    { label: 'Overview', path: '/team-lead', icon: 'dashboard' },
    { label: 'Complaints', path: '/team-lead?tab=complaints', icon: 'assignment' },
    { label: 'My Team', path: '/team-lead?tab=team', icon: 'group' },
    { label: 'Reports', path: '/team-lead?tab=reports', icon: 'trending_up' }
  ]
};

export const ICON_COLORS = {
  total: { color: '#0F4C81', bg: '#DBEAFE' },
  open: { color: '#1D4ED8', bg: '#DBEAFE' },
  assigned: { color: '#7C3AED', bg: '#EDE9FE' },
  in_progress: { color: '#B45309', bg: '#FEF3C7' },
  resolved: { color: '#1A7A4A', bg: '#D1FAE5' },
  closed: { color: '#64748B', bg: '#F1F5F9' },
  pending: { color: '#E8741A', bg: '#FFF7ED' },
  engineers: { color: '#7C3AED', bg: '#EDE9FE' },
  districts: { color: '#14B8A6', bg: '#CCFBF1' },
  today: { color: '#EC4899', bg: '#FCE7F3' },
  rate: { color: '#059669', bg: '#D1FAE5' },
  time: { color: '#0EA5E9', bg: '#E0F2FE' },
  low: { color: '#64748B', bg: '#F1F5F9' },
  medium: { color: '#B45309', bg: '#FEF3C7' },
  high: { color: '#E8741A', bg: '#FFF7ED' },
  critical: { color: '#B91C1C', bg: '#FEE2E2' },
  excel: { color: '#059669', bg: '#D1FAE5' },
  csv: { color: '#1D4ED8', bg: '#DBEAFE' },
  pdf: { color: '#B91C1C', bg: '#FEE2E2' },
  json: { color: '#7C3AED', bg: '#EDE9FE' },
};

export const PAGE_SIZES = [12, 20, 50, 100];

export const TOKEN_KEY = 'token';
export const THEME_KEY = 'theme';
