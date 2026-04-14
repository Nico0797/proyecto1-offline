import React from 'react';
import { Input } from '../ui/Input';
import { APPOINTMENT_STATUS_META } from './helpers';
import type { Employee } from '../../types';
import { cn } from '../../utils/cn';

interface AgendaToolbarProps {
  date: string;
  onDateChange: (date: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  employeeFilter: number | '';
  onEmployeeFilterChange: (id: number | '') => void;
  employees: Employee[];
  statusCounts?: Record<string, number>;
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todas' },
  ...Object.entries(APPOINTMENT_STATUS_META).map(([key, meta]) => ({ value: key, label: meta.label })),
];

export const AgendaToolbar: React.FC<AgendaToolbarProps> = ({
  date,
  onDateChange,
  statusFilter,
  onStatusFilterChange,
  employeeFilter,
  onEmployeeFilterChange,
  employees,
  statusCounts,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div className="min-w-0 sm:w-44">
        <label className="sr-only">Fecha</label>
        <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const active = statusFilter === opt.value;
          const count = opt.value === 'all' ? undefined : statusCounts?.[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilterChange(opt.value)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition sm:text-xs',
                active
                  ? 'border-[color:var(--app-primary-soft-border)] bg-[color:var(--app-primary-soft)] text-[color:var(--app-primary)]'
                  : 'border-[color:var(--app-border)] app-text-secondary hover:border-[color:var(--app-primary-soft-border)] hover:bg-[color:var(--app-primary-soft)]',
              )}
            >
              {opt.label}
              {count != null && count > 0 && (
                <span className="ml-0.5 tabular-nums">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {employees.length > 0 && (
        <div className="min-w-0 sm:w-44">
          <select
            className="w-full app-surface border app-divider rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            value={employeeFilter}
            onChange={(e) => onEmployeeFilterChange(Number(e.target.value) || '')}
          >
            <option value="">Todos los empleados</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
