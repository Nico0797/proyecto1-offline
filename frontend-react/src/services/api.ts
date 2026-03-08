import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { offlineApi } from './offlineApi';

// Simplificación drástica: Usar siempre la configuración de entorno o fallback relativo.
// En desarrollo, .env.development define VITE_API_BASE_URL=/api, que usa el proxy de Vite.
// En producción, se debe definir la URL real o usar relativa si se sirve desde el mismo origen.

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

console.log('🔌 API Client inicializado con baseURL:', baseURL);

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials true ayuda a mantener sesiones si se usan cookies, 
  // pero para JWT en headers no es estrictamente necesario, aunque inofensivo en mismo origen.
  withCredentials: baseURL.startsWith('/'), 
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
    const hasResponse = !!error?.response;

    // Si es un error de red (sin respuesta) o error 5xx, intentar modo offline/mock si aplica
    // Esto es útil si el backend está caído temporalmente
    const isNetworkError = !hasResponse || status === 0;
    const isServerError = status && status >= 500;

    if ((isNetworkError || isServerError) && originalRequest && !originalRequest._offlineTried) {
      console.warn('⚠️ Error de conexión o servidor, intentando offlineApi...', { url: originalRequest.url, status });
      originalRequest._offlineTried = true;
      try {
        const resp = await offlineApi.handle(originalRequest);
        if (resp) {
            console.log('✅ Recuperado vía offlineApi');
            return Promise.resolve(resp as any);
        }
      } catch (e) {
          // Ignorar error de offlineApi y seguir con el error original
      }
    }

    // Manejo básico de 401 (Logout si el token es inválido y no hay refresh logic compleja activa)
    if (status === 401 && !originalRequest._retry) {
      // Aquí podrías poner lógica de refresh token si el backend lo soporta
      // Por ahora, para evitar bucles, logout simple
      console.warn('🔒 Sesión expirada o inválida (401)');
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
