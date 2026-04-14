declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

const DESKTOP_OFFLINE_OVERRIDE_KEY = 'encaja:desktop-offline:enabled';

const readDesktopOfflineOverride = () => {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(DESKTOP_OFFLINE_OVERRIDE_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return null;
};

export const getMobileNativePlatform = (): 'android' | 'ios' | null => {
  if (typeof window === 'undefined') return null;

  try {
    if (typeof window.Capacitor?.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
      const platform = typeof window.Capacitor.getPlatform === 'function' ? window.Capacitor.getPlatform() : null;
      if (platform === 'android' || platform === 'ios') {
        return platform;
      }
    }
  } catch {
    // Ignore runtime detection failures and fall back to protocol/user-agent heuristics.
  }

  const isNativeProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
  if (!isNativeProtocol) return null;

  if (/Android/i.test(navigator.userAgent)) return 'android';
  if (/iPhone|iPad/i.test(navigator.userAgent)) return 'ios';
  return null;
};

export const isDesktopShell = () => {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_FORCE_DESKTOP_OFFLINE === 'true';
  }

  return Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__ || navigator.userAgent.includes('Tauri'));
};

export const isMobileNativeShell = () => {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_FORCE_DESKTOP_OFFLINE === 'true';
  }

  if (getMobileNativePlatform()) {
    return true;
  }

  try {
    if (typeof window.Capacitor?.isNativePlatform === 'function') {
      return Boolean(window.Capacitor.isNativePlatform());
    }
  } catch {
    // Ignore runtime detection failures and fall back to URL/user agent heuristics.
  }

  return window.location.protocol === 'capacitor:' || /Android|iPhone|iPad/i.test(navigator.userAgent) && window.location.protocol === 'file:';
};

export const isDesktopOfflineMode = () => {
  const override = readDesktopOfflineOverride();
  if (override != null) return override;

  return isDesktopShell() || import.meta.env.VITE_FORCE_DESKTOP_OFFLINE === 'true';
};

export const isOfflineProductMode = () => isDesktopOfflineMode() || isMobileNativeShell();

export const getRuntimeModeSnapshot = () => ({
  desktopShell: isDesktopShell(),
  mobileNativeShell: isMobileNativeShell(),
  desktopOfflineMode: isDesktopOfflineMode(),
  offlineProductMode: isOfflineProductMode(),
});

export const getDesktopOfflineOverrideKey = () => DESKTOP_OFFLINE_OVERRIDE_KEY;
