import { PushNotifications, PushNotificationSchema, ActionPerformed, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const pushNotificationService = {
  // Inicialización y configuración de canales
  async init(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push Notifications: Solo disponibles en dispositivos nativos');
      return false;
    }

    try {
      // 1. Crear Canales (Obligatorio Android 8+)
      // Canal Crítico: Sonido, Vibración, Importancia Alta
      await PushNotifications.createChannel({
        id: 'alerts_critical',
        name: 'Alertas Críticas',
        description: 'Notificaciones importantes sobre deudas y stock crítico',
        importance: 5, // High
        visibility: 1, // Public
        vibration: true,
        sound: 'alert_sound', // Si tienes un sonido personalizado, si no usa default
      });

      // Canal Info: Importancia Default
      await PushNotifications.createChannel({
        id: 'alerts_info',
        name: 'Información General',
        description: 'Recordatorios, metas y novedades',
        importance: 3, // Default
        visibility: 1,
        vibration: false,
      });

      // 2. Comprobar permisos
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Permiso de notificaciones push denegado');
        return false;
      }

      // 3. Registrar el dispositivo en FCM
      await PushNotifications.register();
      return true;

    } catch (error) {
      console.error('Error inicializando Push Notifications:', error);
      return false;
    }
  },

  // Configurar listeners (se debe llamar una sola vez, idealmente desde un hook)
  addListeners(
    onRegistration: (token: string) => void,
    onNotificationReceived: (notification: PushNotificationSchema) => void,
    onActionPerformed: (notification: ActionPerformed) => void
  ) {
    if (!Capacitor.isNativePlatform()) return;

    // Limpiar listeners previos para evitar duplicados
    PushNotifications.removeAllListeners();

    // Registro exitoso -> Token FCM
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push Registration Token:', token.value);
      onRegistration(token.value);
    });

    // Error en registro
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error en registro de Push:', error);
    });

    // Notificación recibida en primer plano (Foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push recibida en foreground:', notification);
      onNotificationReceived(notification);
    });

    // Acción al tocar la notificación (Tap)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Acción de Push (Tap):', notification);
      onActionPerformed(notification);
    });
  },

  removeAllListeners() {
    if (!Capacitor.isNativePlatform()) return;
    PushNotifications.removeAllListeners();
  },

  // Método placeholder para enviar token al backend
  async registerTokenInBackend(token: string) {
    try {
        // TODO: Implementar llamada real a API cuando exista el endpoint
        // await api.post('/notifications/register-device', { 
        //   token, 
        //   platform: Capacitor.getPlatform() 
        // });
        console.log('Token listo para backend (simulado):', token);
    } catch (e) {
        console.error('Error guardando token en backend', e);
    }
  }
};
