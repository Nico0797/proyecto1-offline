import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * Este componente invisible se encarga de inicializar el sistema de notificaciones
 * y manejar la navegación cuando el usuario interactúa con una.
 * Debe colocarse dentro del <BrowserRouter> en App.tsx.
 */
export const NotificationController = () => {
  usePushNotifications();
  return null;
};
