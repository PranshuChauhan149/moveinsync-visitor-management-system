import axios from 'axios';
import toast from 'react-hot-toast';

// The API base URL (without /api suffix) — used to resolve local photo URLs
export const SERVER_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
export const API_BASE    = import.meta.env.VITE_API_URL  || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle auth errors globally ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired or invalid — clear local state and redirect to login.
      // Import toast lazily to avoid circular dependency issues.
      toast.error('Your session has expired. Please sign in again.');
      localStorage.removeItem('vms_token');
      localStorage.removeItem('vms_user');
      // Only redirect if not already on login page
      if (!window.location.pathname.startsWith('/login')) {
        // Small delay so the toast is visible before redirect
        setTimeout(() => { window.location.href = '/login'; }, 1200);
      }
    }

    // 403 errors are handled locally by each page/component — don't redirect here.

    return Promise.reject(error);
  }
);

export default api;
