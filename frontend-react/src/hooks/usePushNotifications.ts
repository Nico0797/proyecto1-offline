import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pushNotificationService } from '../services/pushNotificationService';
import { localNotificationService } from '../services/localNotificationService';
import { toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const usePushNotifications = () => {
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      // 1. Inicializar Push (Canales y Permisos)
      const pushGranted = await pushNotificationService.init();
      
      // 2. Inicializar Local (Permisos)
      await localNotificationService.requestPermissions();

      if (pushGranted) {
        setupPushListeners();
      }
      
      // Setup listeners para notificaciones locales también
      setupLocalListeners();
    };

    const setupPushListeners = () => {
      pushNotificationService.addListeners(
        (token) => {
          pushNotificationService.registerTokenInBackend(token);
        },
        (notification) => {
          // Foreground
          toast(notification.title || 'Nueva notificación', {
            icon: '🔔',
            duration: 4000,
          });
        },
        (action) => {
          // Tap Action
          const data = action.notification.data;
          handleNavigation(data);
        }
      );
    };

    const setupLocalListeners = async () => {
        if (!Capacitor.isNativePlatform()) return;

        // Limpiar listeners previos
        await LocalNotifications.removeAllListeners();

        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
            console.log('Local Notification Action:', notification);
            const data = notification.notification.extra;
            handleNavigation(data);
        });
    };

    const handleNavigation = (data: any) => {
      if (!data) return;

      console.log('Navegando desde notificación (payload):', data);

      // Normalizar datos si vienen como string (a veces pasa en Android)
      let payload = data;
      if (typeof data === 'string') {
        try {
            payload = JSON.parse(data);
        } catch (e) {
            console.warn('Error parseando payload de notificación', e);
        }
      }

      // Lógica de navegación
      // 1. Clientes / Deudas
      if (payload.type === 'receivable' && payload.entityId) {
        // Navegar a lista filtrada o detalle
        navigate(`/customers`); 
        // Idealmente: navigate(`/customers/${payload.entityId}`); si existiera la ruta de detalle directo
        // O abrir un modal usando un estado global (Zustand)
        setTimeout(() => {
             // Hack: Si usas query params o hash para abrir modales
             // window.location.hash = `#customer-${payload.entityId}`;
             toast('Revisa el detalle del cliente en la lista', { icon: 'info' });
        }, 500);
      } 
      // 2. Inventario
      else if (payload.type === 'inventory' && payload.entityId) {
        navigate(`/products`);
        setTimeout(() => toast('Producto con stock bajo', { icon: '📦' }), 500);
      } 
      // 3. Recurrentes
      else if (payload.type === 'recurring') {
        navigate('/expenses');
      } 
      // 4. Ruta directa explícita
      else if (payload.path) {
        navigate(payload.path);
      }
    };

    init();

    return () => {
      pushNotificationService.removeAllListeners();
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.removeAllListeners();
      }
    };
  }, [navigate]);
};
