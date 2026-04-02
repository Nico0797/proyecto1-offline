export const resolveApiBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  if (typeof window === 'undefined') {
    return envBaseUrl;
  }

  const storedBaseUrl = window.localStorage.getItem('API_BASE_URL')?.trim();
  const isFileProtocol = window.location.protocol === 'file:';
  const isEnvRelative = envBaseUrl.startsWith('/');

  if (storedBaseUrl && (isFileProtocol || !isEnvRelative)) {
    return storedBaseUrl;
  }

  return envBaseUrl;
};
