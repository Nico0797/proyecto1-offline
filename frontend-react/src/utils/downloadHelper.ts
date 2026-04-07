import { toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import api from '../services/api';

interface DownloadOptions {
  filename: string;
}

interface GeneratedDownloadResponse {
  download_url?: string;
  filename?: string;
}

export interface DownloadedFilePayload {
  blob: Blob;
  filename: string;
}

export const saveBlobFile = async (
  blob: Blob,
  options: DownloadOptions
): Promise<boolean> => {
  const toastId = toast.loading('Preparando archivo...');
  try {
    if (Capacitor.isNativePlatform()) {
      return await handleMobileDownload(blob, options.filename, toastId);
    }
    return await handleWebDownload(blob, options.filename, toastId);
  } catch (error: any) {
    console.error('❌ Error guardando archivo:', error);
    toast.error(error.message || 'No se pudo guardar el archivo.', { id: toastId });
    return false;
  }
};

export const requestGeneratedFile = async (
  generationUrl: string,
  params: Record<string, unknown> = {},
  fallbackFilename: string
): Promise<DownloadedFilePayload> => {
  const response = await api.get<GeneratedDownloadResponse>(generationUrl, { params });
  const downloadUrl = response.data?.download_url;
  if (!downloadUrl) {
    throw new Error('El servidor no devolvió la URL de descarga del archivo.');
  }
  const generatedFilename = response.data?.filename;
  return requestDirectFile(downloadUrl, {}, generatedFilename || fallbackFilename);
};

export const requestDirectFile = async (
  url: string,
  params: Record<string, unknown> = {},
  fallbackFilename: string
): Promise<DownloadedFilePayload> => {
  const response = await api.get(getAbsoluteUrl(url), {
    params,
    responseType: 'blob',
  });

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const contentType = getHeaderValue(response.headers, 'content-type') || blob.type || '';
  if (contentType.includes('application/json')) {
    const text = await blob.text();
    try {
      const payload = JSON.parse(text);
      throw new Error(payload?.error || 'El servidor devolvió una respuesta JSON inesperada.');
    } catch (error) {
      if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
        throw error;
      }
      throw new Error('El servidor devolvió una respuesta JSON inesperada.');
    }
  }

  const filename =
    getFilenameFromContentDisposition(getHeaderValue(response.headers, 'content-disposition'))
    || fallbackFilename
    || getFilenameFromUrl(url);

  return { blob, filename };
};

/**
 * Descarga archivos de manera robusta soportando Web y Móvil (Capacitor)
 */
export const downloadFile = async (
  url: string, 
  options: DownloadOptions,
  token?: string
): Promise<boolean> => {
  const toastId = toast.loading('Descargando archivo...');

  try {
    // 1. Construir URL Absoluta
    const fullUrl = getAbsoluteUrl(url);
    
    // 2. Preparar Headers
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`📥 Iniciando descarga: ${fullUrl}`);

    // 3. Fetch del archivo (Blob)
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    // 4. Verificar si es un error JSON disfrazado
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();
      throw new Error(json.error || 'Error desconocido del servidor');
    }

    const blob = await response.blob();
    return await saveBlobFile(blob, options);

  } catch (error: any) {
    console.error('❌ Error en descarga:', error);
    toast.error(error.message || 'No se pudo descargar el archivo.', { id: toastId });
    return false;
  }
};

/**
 * Manejo específico para Android/iOS
 */
const handleMobileDownload = async (blob: Blob, filename: string, toastId: string): Promise<boolean> => {
  try {
    const base64Data = await blobToBase64(blob);
    
    // Guardar en Cache (temporal seguro)
    const savedFile = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache
    });

    // Compartir inmediatamente
    await Share.share({
      title: 'Reporte Generado',
      text: `Adjunto reporte: ${filename}`,
      url: savedFile.uri,
      dialogTitle: 'Guardar o Enviar Reporte'
    });

    toast.success('Archivo listo', { id: toastId });
    return true;

  } catch (error) {
    console.error('Mobile FS Error:', error);
    throw new Error('No se pudo guardar el archivo en el dispositivo.');
  }
};

/**
 * Manejo estándar para Navegador Web
 */
const handleWebDownload = async (blob: Blob, filename: string, toastId: string): Promise<boolean> => {
  try {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Limpieza
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);

    toast.success('Descarga completada', { id: toastId });
    return true;
  } catch (error) {
    throw new Error('El navegador bloqueó la descarga.');
  }
};

// --- Helpers ---

const getAbsoluteUrl = (relativeUrl: string): string => {
  if (relativeUrl.startsWith('http')) return relativeUrl;
  let baseURL = api.defaults.baseURL || '';
  if (!baseURL.startsWith('http') && typeof window !== 'undefined') {
     baseURL = `${window.location.origin}${baseURL.startsWith('/') ? '' : '/'}${baseURL}`;
  }
  // Limpieza de slashes dobles
  const cleanBase = baseURL.replace(/\/$/, '');
  const cleanPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  return `${cleanBase}${cleanPath}`.replace('/api/api/', '/api/'); // Fix común
};

const getHeaderValue = (headers: any, name: string): string | undefined => {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    return headers.get(name) || headers.get(name.toLowerCase()) || undefined;
  }
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || undefined;
};

const getFilenameFromContentDisposition = (contentDisposition?: string): string | undefined => {
  if (!contentDisposition) return undefined;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''));
  }

  const asciiMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1].trim().replace(/^"|"$/g, '');
  }

  return undefined;
};

const getFilenameFromUrl = (url: string): string => {
  const cleanUrl = url.split('?')[0];
  const parts = cleanUrl.split('/').filter(Boolean);
  return parts[parts.length - 1] || `archivo_${new Date().toISOString().split('T')[0]}.bin`;
};

export const generateFilename = (prefix: string, start?: string, end?: string) => {
  const dateStr = start && end ? `${start}_al_${end}` : new Date().toISOString().split('T')[0];
  return `${prefix}_${dateStr}.xlsx`;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Error encoding base64'));
      }
    };
    reader.readAsDataURL(blob);
  });
};
