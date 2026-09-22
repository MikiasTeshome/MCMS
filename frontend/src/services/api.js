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

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mcms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeLanguage = localStorage.getItem('mcms_lang') || 'en';
    config.headers['Accept-Language'] = activeLanguage;

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = String(error.config?.url || '');
      const isLogin = url.includes('/auth/login');
      if (!isLogin) {
        const sent = String(error.config?.headers?.Authorization || '');
        const current = localStorage.getItem('mcms_token');
        if (current && sent && sent !== `Bearer ${current}`) {
          return Promise.reject(error);
        }
        localStorage.removeItem('mcms_token');
        localStorage.removeItem('mcms_user');
        window.dispatchEvent(new Event('mcms:unauthenticated'));
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
