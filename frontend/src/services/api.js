import axios from 'axios';

function resolveApiBaseUrl() {
  // In dev, use the same host/protocol as the page so phones on the LAN hit the Vite proxy.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1`;
  }
  return import.meta.env.VITE_API_URL || '/api/v1';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Outbound request interceptor
api.interceptors.request.use(
  (config) => {
    // 1. Automatically fetch and attach JWT from localStorage
    const token = localStorage.getItem('mcms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Automatically fetch and attach active i18n locale
    const activeLanguage = localStorage.getItem('mcms_lang') || 'en';
    config.headers['Accept-Language'] = activeLanguage;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (logs out user if session becomes unauthenticated)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('mcms_token');
      localStorage.removeItem('mcms_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
