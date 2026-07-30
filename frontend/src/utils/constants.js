export const ISSUE_CATEGORIES = [
  'No Internet Connectivity',
  'Slow Internet Speed',
  'Frequent Disconnections',
  'WiFi Not Visible / SSID Not Broadcasting',
  'Unable to Connect to WiFi',
  'Limited Connectivity (Connected but No Internet)',
  'Router / Access Point Not Working',
  'Power Issue at Equipment',
  'Other'
];

export const FACILITY_TYPES = ['DH', 'SDH', 'CHC', 'PHC', 'UPHC', 'HSC'];

export const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

export const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

export const NAV_ITEMS = {
  admin: [
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Engineers', path: '/admin?tab=engineers', icon: '👷' },
    { label: 'Mapping', path: '/admin?tab=mapping', icon: '🗺️' },
    { label: 'Reports', path: '/admin?tab=reports', icon: '📈' },
    { label: 'Seed Data', path: '/admin?tab=seed', icon: '🌱' }
  ],
  management: [
    { label: 'Dashboard', path: '/management', icon: '📊' },
    { label: 'Complaints', path: '/management?tab=complaints', icon: '📋' }
  ]
};

export const PAGE_SIZES = [12, 20, 50, 100];

export const MAX_DESCRIPTION_LENGTH = 2000;
