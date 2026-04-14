import React from 'react';
import { Check, X, Clock, UserX, Edit2 } from 'lucide-react';
import type { Appointment } from '../../types';
import { formatCOP, formatTime, getStatusMeta } from './helpers';
import { cn } from '../../utils/cn';

interface AppointmentCardProps {
  appointment: Appointment;
  onComplete: (appt: Appointment) => void;
  onCancel: (appt: Appointment) => void;
  onNoShow: (appt: Appointment) => void;
  onEdit: (appt: Appointment) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onComplete,
  onCancel,
  onNoShow,
  onEdit,
}) => {
  const meta = getStatusMeta(appointment.status);
  const isActionable = appointment.status === 'scheduled';

  return (
    <div className="app-section-card rounded-2xl p-3.5 sm:p-4 transition-all">
      <div className="flex items-start gap-3">
        {/* Time column */}
        <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
          <Clock className="h-3.5 w-3.5 app-text-muted" />
          <span className="text-[11px] font-semibold app-text tabular-nums">{formatTime(appointment.starts_at)}</span>
          <span className="text-[10px] app-text-muted tabular-nums">{formatTime(appointment.ends_at)}</span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold app-text">{appointment.service_name_snapshot}</span>
            <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none', meta.color)}>
              {meta.label}
            </span>
          </div>

          {appointment.customer_name && (
            <p className="mt-0.5 truncate text-xs app-text-secondary">{appointment.customer_name}</p>
          )}

          {appointment.employee_name_snapshot && (
            <p className="mt-0.5 truncate text-[11px] app-text-muted">
              Atiende: {appointment.employee_name_snapshot}
            </p>
          )}

          {appointment.notes && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 app-text-muted italic">{appointment.notes}</p>
          )}

          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-xs font-semibold app-text">{formatCOP(appointment.price_snapshot)}</span>
            {appointment.linked_sale_id && (
              <span className="text-[10px] app-text-muted">Venta #{appointment.linked_sale_id}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {isActionable && (
          <div className="flex shrink-0 items-start gap-1">
            <button
              type="button"
              onClick={() => onComplete(appointment)}
              title="Completar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-green-600 transition hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(appointment)}
              title="Editar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full app-text-muted transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onCancel(appointment)}
              title="Cancelar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNoShow(appointment)}
              title="No asistio"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full app-text-muted transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <UserX className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
