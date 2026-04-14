import axios from 'axios';
import toast from 'react-hot-toast';
import { resetAuthSessionState, syncAuthToken } from '../store/authStore';
import { resolveApiBaseUrl } from './apiBase';
import {
  applyDemoPreviewOverlayToResponse,
  buildDemoPreviewSimulationResponse,
  canSimulateDemoPreviewRequest,
  isDemoPreviewSensitiveAction,
} from './demoPreviewSimulation';
import { isOfflineProductMode } from '../runtime/runtimeMode';

type RetriableRequestConfig = {
  _retry?: boolean;
  __skipAuthRefresh?: boolean;
};

const baseURL = resolveApiBaseUrl();

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: baseURL.startsWith('/'),
});

let refreshPromise: Promise<string | null> | null = null;
let previewToastCooldownUntil = 0;
let previewSuccessToastCooldownUntil = 0;
let previewSensitiveToastCooldownUntil = 0;

const PREVIEW_HEADER_NAME = 'X-Demo-Preview';
const ACCOUNT_ACCESS_STORAGE_KEY = 'account_access_snapshot';
const PREVIEW_WRITE_EXEMPT_PREFIXES = [
  '/account/preview/',
  '/billing/checkout',
  '/billing/confirm-wompi',
  '/billing/portal',
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
  '/auth/logout',
  '/invitations/register',
];
const PREVIEW_HEADER_EXCLUDED_PREFIXES = [
  '/account/access',
  '/account/preview/',
  '/billing/',
  '/auth/me',
  '/auth/refresh',
  '/auth/logout',
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/invitations/register',
];
const PUBLIC_AUTH_PAGE_PATHS = [
  '/',
  '/login',
  '/auth/login',
  '/team-login',
  '/register',
  '/accept-invite',
  '/admin/login',
];
const PUBLIC_AUTH_REQUEST_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/me',
  '/auth/refresh',
  '/auth/logout',
  '/invitations/register',
];

const normalizeUrlPath = (url?: string) => {
  const raw = String(url || '');
  if (!raw) return '/';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw;
    }
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const isPreviewWriteExempt = (path: string) =>
  PREVIEW_WRITE_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));

const shouldAttachPreviewHeader = (path: string) =>
  !PREVIEW_HEADER_EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));

const isPublicAuthPage = () => {
  if (typeof window === 'undefined') return false;
  const currentPath = window.location.pathname || '/';
  return PUBLIC_AUTH_PAGE_PATHS.some((path) => currentPath === path);
};

const isPublicAuthRequest = (path: string) =>
  PUBLIC_AUTH_REQUEST_PREFIXES.some((prefix) => path.startsWith(prefix));

const notifyPreviewReadOnly = () => {
  const now = Date.now();
  if (now < previewToastCooldownUntil) return;
  previewToastCooldownUntil = now + 2500;
  toast.error('Esta vista previa no guarda cambios reales. Activa un plan para persistir tu información.');
};

const notifyPreviewSimulatedSuccess = () => {
  const now = Date.now();
  if (now < previewSuccessToastCooldownUntil) return;
  previewSuccessToastCooldownUntil = now + 2200;
  toast.success('Así se vería guardado en tu negocio. En esta vista previa el cambio es temporal.');
};

const notifyPreviewSensitiveBlocked = () => {
  const now = Date.now();
  if (now < previewSensitiveToastCooldownUntil) return;
  previewSensitiveToastCooldownUntil = now + 2600;
  toast('Esta acción no está disponible en la vista previa interactiva. Activa un plan para usarla con datos reales.', {
    icon: '🔒',
  });
};

const createPreviewNoPersistError = (path: string, method: string) => {
  const error: any = new Error('Vista previa sin persistencia');
  error.config = { url: path, method };
  error.response = {
    status: 403,
    data: {
      error: 'Vista previa interactiva: tus cambios no se guardan. Activa un plan para persistir información real.',
      code: 'preview_no_persist',
    },
  };
  error.isPreviewNoPersist = true;
  return error;
};

const isDemoPreviewActive = () => {
  if (isOfflineProductMode()) return false;
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(ACCOUNT_ACCESS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.demo_preview_active);
  } catch {
    return false;
  }
};

const forceLogout = () => {
  if (isOfflineProductMode()) {
    return;
  }
  resetAuthSessionState();

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('Refresh token faltante');
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${baseURL}/auth/refresh`,
        { refresh_token: refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: baseURL.startsWith('/'),
        }
      )
      .then((response) => {
        const nextToken = response.data?.access_token || null;
        if (!nextToken) {
          throw new Error('Access token no recibido');
        }

        syncAuthToken(nextToken);
        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use(
  (config) => {
    const path = normalizeUrlPath(config.url);
    const method = String(config.method || 'get').toLowerCase();
    const isDemoPreview = isDemoPreviewActive();
    const isPublicAuthContext = isPublicAuthPage() || isPublicAuthRequest(path);

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isPublicAuthContext) {
      return config;
    }

    if (isDemoPreview && !['get', 'head', 'options'].includes(method) && !isPreviewWriteExempt(path)) {
      if (isDemoPreviewSensitiveAction(path, method)) {
        config.adapter = async () => {
          notifyPreviewSensitiveBlocked();
          return Promise.reject(createPreviewNoPersistError(path, method));
        };
        return config;
      }

      if (canSimulateDemoPreviewRequest(path, method)) {
        config.adapter = async () => {
          notifyPreviewSimulatedSuccess();
          return buildDemoPreviewSimulationResponse(config);
        };
        return config;
      }

      config.adapter = async () => {
        notifyPreviewReadOnly();
        return Promise.reject(createPreviewNoPersistError(path, method));
      };
      return config;
    }

    if (isDemoPreview && shouldAttachPreviewHeader(path)) {
      config.headers[PREVIEW_HEADER_NAME] = '1';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (isDemoPreviewActive() && !isPublicAuthPage()) {
      const path = normalizeUrlPath(response.config?.url);
      response.data = applyDemoPreviewOverlayToResponse(path, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = (error.config || {}) as typeof error.config & RetriableRequestConfig;
    const suppress403Warning = Boolean(originalRequest?.__silent403);
    const suppress404Warning = Boolean(originalRequest?.__silent404);

    if (!error.response) {
      const offlineError = error as any;
      offlineError.isOfflineRequestError = true;
      offlineError.isNetworkError = true;
      if (isOfflineProductMode()) {
        offlineError.message = 'No se pudo preparar la informacion local.';
      }
      return Promise.reject(offlineError);
    }

    if (error.response?.status >= 500) {
      console.error(`Server error ${error.response.status} for ${originalRequest?.url}`);
      return Promise.reject(error);
    }

    const isRefreshRequest = String(originalRequest?.url || '').includes('/auth/refresh');
    const canRetryAuth =
      error.response?.status === 401
      && !originalRequest?._retry
      && !originalRequest?.__skipAuthRefresh
      && !isRefreshRequest;

    if (canRetryAuth) {
      originalRequest._retry = true;

      try {
        const nextToken = await refreshAccessToken();
        if (!nextToken) {
          forceLogout();
          return Promise.reject(error);
        }

        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${nextToken}`,
        };

        return api(originalRequest);
      } catch (refreshError) {
        const refreshStatus = (refreshError as { response?: { status?: number } })?.response?.status;
        const isMissingRefreshToken = (refreshError as Error)?.message === 'Refresh token faltante';

        if (refreshStatus === 401 || isMissingRefreshToken) {
          forceLogout();
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) {
      const requestUrl = String(originalRequest?.url || '');
      const isInteractiveAuthRequest =
        requestUrl.includes('/auth/login')
        || requestUrl.includes('/auth/register')
        || requestUrl.includes('/auth/verify-email')
        || requestUrl.includes('/auth/forgot-password')
        || requestUrl.includes('/auth/reset-password')
        || requestUrl.includes('/invitations/register')
        || isPublicAuthPage();

      if (!isInteractiveAuthRequest) {
        forceLogout();
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      if (!isPublicAuthPage() && (error.response?.data?.code === 'preview_read_only' || error.response?.data?.code === 'preview_no_persist')) {
        notifyPreviewReadOnly();
      }
      if (!suppress403Warning) {
        console.warn(`Access forbidden for ${originalRequest?.url}`);
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 404) {
      if (!suppress404Warning) {
        console.warn(`Resource not found: ${originalRequest?.url}`);
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
