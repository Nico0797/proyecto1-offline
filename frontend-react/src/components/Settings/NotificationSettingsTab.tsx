import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { settingsService, NotificationSettings } from '../../services/settingsService';
import { Bell, ToggleRight, ToggleLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const NotificationSettingsTab = () => {
  const [formData, setFormData] = useState<NotificationSettings>({
    debtAlerts: true,
    recurringAlerts: true,
    reminders: true,
    showBadges: true,
    weeklySummary: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const data = settingsService.getNotifications();
    setFormData(data);
  }, []);

  const toggle = (key: keyof NotificationSettings) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    settingsService.updateNotifications(formData);
    setLoading(false);
    toast.success('Notificaciones actualizadas');
  };

  return (
    <div className="app-surface max-w-xl animate-in fade-in p-6 duration-300">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
        <Bell className="w-6 h-6 text-yellow-500" />
        Preferencias de Notificaciones
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Alertas de Deudas</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recibe avisos cuando una cuenta por cobrar venza.</p>
            </div>
            <button type="button" onClick={() => toggle('debtAlerts')} className="text-2xl text-blue-500 focus:outline-none">
              {formData.debtAlerts ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Gastos Recurrentes</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recordatorios automáticos de pagos fijos (alquiler, servicios).</p>
            </div>
            <button type="button" onClick={() => toggle('recurringAlerts')} className="text-2xl text-blue-500 focus:outline-none">
              {formData.recurringAlerts ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Recordatorios Diarios</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Notas y tareas pendientes en el dashboard.</p>
            </div>
            <button type="button" onClick={() => toggle('reminders')} className="text-2xl text-blue-500 focus:outline-none">
              {formData.reminders ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Resumen Semanal</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Informe breve de rendimiento al inicio de semana.</p>
            </div>
            <button type="button" onClick={() => toggle('weeklySummary')} className="text-2xl text-blue-500 focus:outline-none">
              {formData.weeklySummary ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button type="submit" disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
            {loading ? 'Guardando...' : 'Guardar Preferencias'}
          </Button>
        </div>
      </form>
    </div>
  );
};
