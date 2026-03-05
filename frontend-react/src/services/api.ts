import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Compute base URL with runtime override support for mobile/WebView environments.
// Priority:
// 1) localStorage.API_BASE_URL (editable desde UI)
// 2) VITE_API_BASE_URL (inyectado en build)
// 3) '/api' (mismo origen con proxy en dev)
const runtimeBase = (typeof window !== 'undefined' && localStorage.getItem('API_BASE_URL')) || '';
const envBase = import.meta.env.VITE_API_BASE_URL || '';
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

// Si se ejecuta desde archivo (APK/WebView sin servidor) y no hay configuración,
// damos un valor por defecto útil para emulador Android (10.0.2.2 apunta a localhost).
const fallbackForFile = isFileProtocol ? 'http://10.0.2.2:8001/api' : '/api';

const baseURL = (runtimeBase.trim() || envBase.trim() || fallbackForFile).replace(/\/+$/, '');
const isRelative = baseURL.startsWith('/');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Solo enviamos credenciales en mismo-origen; en dominios cruzados suele causar problemas de CORS innecesarios
  withCredentials: isRelative,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    
    // Prevent infinite loops
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Use baseURL to ensure we hit the correct backend (Cross-Domain or Same-Origin)
          // We remove the trailing slash from baseURL if it exists to avoid double slashes, though axios usually handles it.
          // However, simple string template is safer if we ensure baseURL convention.
          // If baseURL='/api', result is '/api/auth/refresh'
          // If baseURL='https://api.com/api', result is 'https://api.com/api/auth/refresh'
          const url = `${baseURL}/auth/refresh`.replace('//auth', '/auth'); // Simple safety for double slash
          const { data } = await axios.post(url, { refresh_token: refreshToken });
          
          if (data.access_token) {
            localStorage.setItem('token', data.access_token);
            api.defaults.headers['Authorization'] = `Bearer ${data.access_token}`;
            originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - clean up and redirect
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('activeBusiness');
          try {
            useAuthStore.getState().logout();
          } catch {}
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          return Promise.reject(refreshError);
        }
      } else {
          // No refresh token available
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('activeBusiness');
          try {
            useAuthStore.getState().logout();
          } catch {}
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
      }
    }

    // Handle 401 after retry (Access Denied to specific resource even with valid token)
    if (status === 401 && originalRequest._retry) {
        // If we are accessing a business resource, the user might not have access to this business anymore
        if (originalRequest.url?.includes('/businesses/')) {
            console.warn('Access denied to business resource. Resetting active business.');
            localStorage.removeItem('activeBusiness');
            // Force reload to dashboard to refetch available businesses
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                 window.location.href = '/dashboard';
            }
        }
    }
    
    return Promise.reject(error);
  }
);

export default api;
