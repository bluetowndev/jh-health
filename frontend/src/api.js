import axios from 'axios';
import toast from 'react-hot-toast';
import { TOKEN_KEY } from './utils/constants';

const API_BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const API = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Attach token to every request
API.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor with retry logic
API.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;

    // Handle 401
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
      return Promise.reject(err);
    }

    // Handle 403
    if (err.response?.status === 403) {
      toast.error('You do not have permission for this action');
      return Promise.reject(err);
    }

    // Handle 429
    if (err.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment and try again.');
      return Promise.reject(err);
    }

    // Retry on network errors or 5xx (not 401/403/429)
    if (
      !err.response ||
      (err.response.status >= 500 && err.response.status < 600) ||
      err.code === 'ERR_NETWORK' ||
      err.code === 'ECONNABORTED'
    ) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        await delay(RETRY_DELAY * config.__retryCount);
        return API(config);
      }
    }

    return Promise.reject(err);
  }
);

// ---- Auth ----
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const registerUser = (data) => API.post('/auth/register', data);

// ---- Facilities ----
export const getDistricts = () => API.get('/facilities/districts');
export const getFacilityTypes = (district) =>
  API.get('/facilities/types', { params: { district } });
export const getFacilities = (district, type) =>
  API.get('/facilities', { params: { district, type } });
export const seedFacilities = (facilities) => API.post('/facilities/seed', { facilities });
export const getNotificationDirectory = () => API.get('/notifications/directory');
export const saveGlobalNotificationContacts = (data) => API.put('/notifications/globals', data);
export const saveFacilityNotificationMapping = (facilityCode, data) =>
  API.put(`/notifications/mappings/${facilityCode}`, data);

// ---- Complaints (public) ----
export const sendEmailOTP = (email) => API.post('/complaints/send-email-otp', { email });
export const verifyEmailOTP = (email, otp) => API.post('/complaints/verify-email-otp', { email, otp });
export const submitComplaint = (data) => API.post('/complaints', data);
export const uploadComplaintImages = (files) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('images', f));
  return API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
};
export const checkDuplicateComplaint = (facilityCode, issueCategory) =>
  API.post('/complaints/check-duplicate', { facilityCode, issueCategory });
export const trackComplaintsByContact = (params) => API.get('/complaints/track', { params });
export const trackComplaint = (ticketId) => API.get(`/complaints/track/${ticketId}`);

// ---- Complaints (protected) ----
export const getComplaints = (params, signal) => API.get('/complaints', { params, signal });
export const getEngineerStats = () => API.get('/complaints/engineer-stats');
export const getComplaintStats = () => API.get('/complaints/stats');
export const getComplaintById = (id) => API.get(`/complaints/${id}`);
export const assignComplaint = (id, engineerId) => API.patch(`/complaints/${id}/assign`, { engineerId });
export const acceptTicket = (id) => API.patch(`/complaints/${id}/accept`, {});
export const updateComplaintStatus = (id, data) => API.patch(`/complaints/${id}/status`, data);

// ---- Users ----
export const getUsers = () => API.get('/users');
export const getEngineers = () => API.get('/users/engineers');
export const getTeamLeads = () => API.get('/users/team-leads');
export const updateUser = (id, data) => API.patch(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);

// ---- Team Lead Dashboard ----
export const getTeamLeadStats = () => API.get('/teamlead/stats');
export const getTeamLeadComplaints = (params, options) => API.get('/teamlead/complaints', { params, ...options });
export const tlAssignComplaint = (id, engineerId) =>
  API.patch(`/teamlead/complaints/${id}/assign`, { engineerId });
export const tlUpdateComplaintStatus = (id, data) =>
  API.patch(`/teamlead/complaints/${id}/status`, data);
export const getTeamLeadDebug = () => API.get('/teamlead/debug');

// ---- Management Dashboard ----
export const getManagementStats = (params) => API.get('/management/stats', { params });
export const getManagementComplaints = (params) => API.get('/management/complaints', { params });

// ---- XSS-safe helpers for exports ----
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default API;
