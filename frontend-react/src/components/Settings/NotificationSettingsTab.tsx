import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { settingsService, NotificationSettings } from '../../services/settingsService';
import { Bell, ToggleRight, ToggleLeft } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    settingsService.updateNotifications(formData);
    setLoading(false);
    alert('Notificaciones actualizadas');
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-xl animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6 text-yellow-500" />
        Preferencias de Notificaciones
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-white">Alertas de Deudas</p>
              <p className="text-sm text-gray-400">Recibe avisos cuando una cuenta por cobrar venza.</p>
            </div>
            <button type="button" onClick={() => toggle('debtAlerts')} className="text-2xl text-blue-500 focus:outline-none">
              {formData.debtAlerts ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-white">Gastos Recurrentes</p>
              <p className="text-sm text-gray-400">Recordatorios automáticos de pagos fijos (alquiler, servicios).</p>
            </div>
            <button type="button" onClick={() => toggle('recurringAlerts')} className="text-2xl text-blue-500 focus:outline-none">
              {formData.recurringAlerts ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-white">Recordatorios Diarios</p>
              <p className="text-sm text-gray-400">Notas y tareas pendientes en el dashboard.</p>
            </div>
            <button type="button" onClick={() => toggle('reminders')} className="text-2xl text-blue-500 focus:outline-none">
              {formData.reminders ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-white">Resumen Semanal</p>
              <p className="text-sm text-gray-400">Informe breve de rendimiento al inicio de semana.</p>
            </div>
            <button type="button" onClick={() => toggle('weeklySummary')} className="text-2xl text-blue-500 focus:outline-none">
              {formData.weeklySummary ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700 flex justify-end">
          <Button type="submit" disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
            {loading ? 'Guardando...' : 'Guardar Preferencias'}
          </Button>
        </div>
      </form>
    </div>
  );
};
