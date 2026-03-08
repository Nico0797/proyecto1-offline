import { toast } from 'react-hot-toast';

interface DownloadOptions {
  filename: string;
  mimeType?: string;
}

/**
 * Helper to download files securely and compatible with mobile devices.
 * It uses Blob and URL.createObjectURL which is better supported than data: URIs.
 */
export const downloadFile = async (
  url: string, 
  options: DownloadOptions,
  token?: string
): Promise<boolean> => {
  const toastId = toast.loading('Preparando descarga...');

  try {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    // Create a temporary URL for the blob
    const downloadUrl = window.URL.createObjectURL(blob);
    
    // Create a hidden anchor tag
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = options.filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    
    // Trigger click
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);

    toast.success('Descarga iniciada', { id: toastId });
    return true;

  } catch (error) {
    console.error('Download failed:', error);
    toast.error('No se pudo descargar el archivo. Intente nuevamente.', { id: toastId });
    return false;
  }
};

/**
 * Helper to generate a standardized filename
 */
export const generateFilename = (prefix: string, startDate?: string, endDate?: string, ext: string = 'xlsx') => {
  const dateStr = startDate && endDate 
    ? `${startDate}_a_${endDate}`
    : new Date().toISOString().split('T')[0];
    
  return `${prefix}_${dateStr}.${ext}`;
};
