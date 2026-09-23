import api from './api';

export const authService = {
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  getMe:    ()     => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data), // ADMIN only
};

export const userService = {
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.patch(`/users/${id}`, data),
};

export const visitorService = {
  getVisitors: (params) => api.get('/visitors', { params }),
  getVisitorById: (id) => api.get(`/visitors/${id}`),
  getTodaysVisitors: () => api.get('/visitors/today'),
  createVisitor: (data) => api.post('/visitors', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateVisitor: (id, data) => api.patch(`/visitors/${id}`, data),
  deleteVisitor: (id) => api.delete(`/visitors/${id}`),
};

export const approvalService = {
  getApprovals:    (params) => api.get('/approvals', { params }),
  getApprovalById: (id)     => api.get(`/approvals/${id}`),
  getPendingCount: ()       => api.get('/approvals/pending-count'),
  approveVisitor:  (id)     => api.patch(`/approvals/${id}/approve`),
  rejectVisitor:   (id, data) => api.patch(`/approvals/${id}/reject`, data),
  runExpiration:   ()       => api.post('/approvals/expire'),
};

export const passService = {
  getPassByVisitor: (visitorId) => api.get(`/passes/visitor/${visitorId}`),
  generatePass: (visitorId) => api.post(`/passes/generate/${visitorId}`),
  verifyPass: (passCode) => api.get(`/passes/verify/${passCode}`),
};

export const visitService = {
  getVisits: (params) => api.get('/visits', { params }),
  checkIn: (visitorId) => api.post(`/visits/checkin/${visitorId}`),
  checkOut: (visitorId) => api.post(`/visits/checkout/${visitorId}`),
};

export const reportService = {
  getDashboardStats: () => api.get('/reports/dashboard'),
  getAnalytics: (params) => api.get('/reports/analytics', { params }),
};

export const auditService = {
  getAuditLogs: (params) => api.get('/audit-logs', { params }),
};
