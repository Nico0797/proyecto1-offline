import type { AppointmentStatus } from '../../types';

export const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, { label: string; color: string }> = {
  scheduled: {
    label: 'Agendada',
    color: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200',
  },
  completed: {
    label: 'Completada',
    color: 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200',
  },
  cancelled: {
    label: 'Cancelada',
    color: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200',
  },
  no_show: {
    label: 'No asistio',
    color: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-500/20 dark:bg-gray-500/10 dark:text-gray-300',
  },
};

export const getStatusMeta = (status: AppointmentStatus) =>
  APPOINTMENT_STATUS_META[status] ?? APPOINTMENT_STATUS_META.scheduled;

export const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
};

export const formatDateShort = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

export const todayISO = () => new Date().toISOString().split('T')[0];
