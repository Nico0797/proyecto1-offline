import { toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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

    // Check if running on native platform (iOS/Android)
    if (Capacitor.isNativePlatform()) {
      try {
        // Convert Blob to Base64
        const base64Data = await blobToBase64(blob);
        const fileName = options.filename;

        // Write file to Cache directory (no permission needed)
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });

        // Share the file
        await Share.share({
          title: 'Descargar Reporte',
          text: `Aquí está tu reporte: ${fileName}`,
          url: savedFile.uri,
          dialogTitle: 'Descargar o Compartir Reporte'
        });

        toast.success('Reporte listo para guardar', { id: toastId });
        return true;
      } catch (mobileError) {
        console.error('Mobile download failed:', mobileError);
        // Fallback: try to open in browser if share fails? No, usually Share is robust.
        throw mobileError;
      }
    } else {
      // Desktop / Web implementation
      
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
    }

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

// Helper function to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g. "data:application/pdf;base64,")
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.readAsDataURL(blob);
  });
};
