import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const localNotificationService = {
  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    
    try {
      const permissions = await LocalNotifications.checkPermissions();
      if (permissions.display !== 'granted') {
        const request = await LocalNotifications.requestPermissions();
        if (request.display !== 'granted') {
          console.warn('Permiso de notificaciones locales denegado');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error solicitando permisos locales:', error);
      return false;
    }
  },

  async schedule(
    title: string,
    body: string,
    data: any = {},
    scheduleDate?: Date,
    channelId: 'alerts_critical' | 'alerts_info' = 'alerts_info'
  ) {
    if (!Capacitor.isNativePlatform()) {
      // Fallback web básico
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, data });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, data });
          }
        });
      }
      return;
    }

    try {
      // Asegurar permisos antes de programar
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      const id = Math.floor(Math.random() * 2147483647); // Int32 max safe
      
      const options: ScheduleOptions = {
        notifications: [
          {
            title,
            body,
            id,
            schedule: scheduleDate ? { at: scheduleDate } : { at: new Date(Date.now() + 1000) }, // 1s delay
            channelId,
            extra: data,
            smallIcon: 'ic_stat_notifications', // Debe existir en android/app/src/main/res/drawable
            actionTypeId: '',
          }
        ]
      };

      await LocalNotifications.schedule(options);
      console.log(`Notificación local programada [${channelId}]: ${title}`);
    } catch (error) {
      console.error('Error al programar notificación local:', error);
    }
  },
  
  async cancelAll() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel(pending);
        }
    } catch (e) {
        console.error('Error cancelando notificaciones:', e);
    }
  }
};
