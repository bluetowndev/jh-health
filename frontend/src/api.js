import axios from 'axios';

// Use REACT_APP_API_URL in production (e.g. Render); fallback to /api for local dev (proxy)
const API_BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const API = axios.create({ baseURL: API_BASE });

// Attach token to every request
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 (expired/invalid token), clear auth and redirect to login
API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const registerUser = (data) => API.post('/auth/register', data);

// Facilities
export const getDistricts = () => API.get('/facilities/districts');
export const getFacilityTypes = (district) => API.get(`/facilities/types?district=${district}`);
export const getFacilities = (district, type) => API.get(`/facilities?district=${district}&type=${type}`);
export const seedFacilities = (facilities) => API.post('/facilities/seed', { facilities });
export const getNotificationDirectory = () => API.get('/notifications/directory');
export const saveGlobalNotificationContacts = (data) => API.put('/notifications/globals', data);
export const saveFacilityNotificationMapping = (facilityCode, data) => API.put(`/notifications/mappings/${facilityCode}`, data);

// Complaints (public)
export const checkDuplicateComplaint = (facilityCode, issueCategory) =>
  API.get('/complaints/check-duplicate', { params: { facilityCode, issueCategory: issueCategory.join(',') } });
export const sendEmailOTP = (email) => API.post('/complaints/send-email-otp', { email });
export const verifyEmailOTP = (email, otp) => API.post('/complaints/verify-email-otp', { email, otp });
export const submitComplaint = (data) => API.post('/complaints', data);
export const uploadComplaintImages = (files) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('images', f));
  return API.post('/upload', formData);
};
export const trackComplaintsByContact = (params) => API.get('/complaints/track', { params });
export const trackComplaint = (ticketId) => API.get(`/complaints/track/${ticketId}`);

// Complaints (protected)
export const getComplaints = (params) => API.get('/complaints', { params });
export const getComplaintStats = () => API.get('/complaints/stats');
export const getComplaintById = (id) => API.get(`/complaints/${id}`);
export const assignComplaint = (id, engineerId) => API.patch(`/complaints/${id}/assign`, { engineerId });
export const acceptTicket = (id) => API.patch(`/complaints/${id}/accept`, {});
export const updateComplaintStatus = (id, data) => API.patch(`/complaints/${id}/status`, data);

// Users
export const getUsers = () => API.get('/users');
export const getEngineers = () => API.get('/users/engineers');
export const updateUser = (id, data) => API.patch(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);

export default API;