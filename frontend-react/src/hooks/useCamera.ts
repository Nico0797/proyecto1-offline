import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

export interface UseCameraReturn {
  photo: string | undefined;
  takePhoto: () => Promise<void>;
  deletePhoto: () => void;
  setPhoto: (photo: string | undefined) => void;
  isAvailable: boolean;
}

export const useCamera = (): UseCameraReturn => {
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const isAvailable = Capacitor.isNativePlatform() || navigator.mediaDevices !== undefined;

  const takePhoto = async () => {
    try {
      if (!isAvailable) {
        toast.error('Cámara no disponible en este dispositivo');
        return;
      }

      // Solicitar permisos explícitamente
      const permissions = await Camera.checkPermissions();
      console.log('Permisos de cámara:', permissions);

      if (permissions.camera === 'denied' || permissions.photos === 'denied') {
        const permissionRequest = await Camera.requestPermissions();
        if (permissionRequest.camera === 'denied' || permissionRequest.photos === 'denied') {
          toast.error('Se requieren permisos de cámara y galería');
          return;
        }
      }

      console.log('Intentando abrir cámara...');
      const capturedPhoto = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        saveToGallery: false,
        width: 800,
        // Añadido para evitar problemas en algunos dispositivos
        presentationStyle: 'popover' 
      });

      console.log('Foto capturada con éxito');
      if (capturedPhoto.dataUrl) {
        setPhoto(capturedPhoto.dataUrl);
      }
    } catch (error: any) {
      console.error('Error detallado al tomar foto:', error);
      // Solo mostrar toast si NO es cancelación voluntaria
      if (error.message !== 'User cancelled photos app' && !error.message.includes('cancelled')) {
         toast.error(`Error: ${error.message || 'No se pudo abrir la cámara'}`);
      }
    }
  };

  const deletePhoto = () => {
    setPhoto(undefined);
  };

  return {
    photo,
    takePhoto,
    deletePhoto,
    setPhoto,
    isAvailable
  };
};
