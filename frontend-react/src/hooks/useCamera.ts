import { useState } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

export interface UseCameraReturn {
  photo: string | undefined;
  takePhoto: () => Promise<void>;
  clearPhoto: () => void;
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

      // Solicitar permisos explícitamente si es necesario (aunque getPhoto lo hace)
      const permissions = await Camera.checkPermissions();
      if (permissions.camera === 'denied' || permissions.photos === 'denied') {
        const permissionRequest = await Camera.requestPermissions();
        if (permissionRequest.camera === 'denied' || permissionRequest.photos === 'denied') {
          toast.error('Se requieren permisos de cámara para continuar');
          return;
        }
      }

      const capturedPhoto = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera, // O Prompt para dejar elegir al usuario
        saveToGallery: false // Evitar llenar la galería del usuario con fotos temporales
      });

      // En web, webPath es un blob url. En nativo, es un path file://
      if (capturedPhoto.webPath) {
        setPhoto(capturedPhoto.webPath);
      }
    } catch (error: any) {
      // Ignorar error si el usuario canceló
      if (error.message !== 'User cancelled photos app') {
        console.error('Error al tomar foto:', error);
        toast.error('No se pudo tomar la foto');
      }
    }
  };

  const clearPhoto = () => {
    setPhoto(undefined);
  };

  return {
    photo,
    takePhoto,
    clearPhoto,
    isAvailable
  };
};
