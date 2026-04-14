import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '../../types';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface AgendaMonthCalendarProps {
  appointments: Appointment[];
  selectedDate: string;
  visibleMonth: string;
  onMonthChange: (nextMonth: string) => void;
  onSelectDate: (date: string) => void;
}

type DayStatusCounts = Record<AppointmentStatus, number>;

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const pad = (value: number) => String(value).padStart(2, '0');

const toMonthValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

const toDateValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseMonth = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const safeMonth = Number.isFinite(month) ? month - 1 : new Date().getMonth();
  return new Date(safeYear, safeMonth, 1);
};

const buildMonthMatrix = (monthValue: string) => {
  const monthDate = parseMonth(monthValue);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingDays + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const cellDate = new Date(year, month, index - leadingDays + 1);
    return {
      date: cellDate,
      iso: toDateValue(cellDate),
      inMonth: cellDate.getMonth() === month,
    };
  });
};

const buildStatusMap = (appointments: Appointment[]) => {
  return appointments.reduce<Record<string, DayStatusCounts>>((acc, appointment) => {
    const key = appointment.starts_at.slice(0, 10);
    if (!acc[key]) {
      acc[key] = {
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      };
    }
    const status = appointment.status as AppointmentStatus;
    acc[key][status] += 1;
    return acc;
  }, {});
};

const STATUS_DOT_CLASS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-rose-500',
  no_show: 'bg-slate-400',
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Pendientes',
  completed: 'Completadas',
  cancelled: 'Canceladas',
  no_show: 'No asistio',
};

export const AgendaMonthCalendar: React.FC<AgendaMonthCalendarProps> = ({
  appointments,
  selectedDate,
  visibleMonth,
  onMonthChange,
  onSelectDate,
}) => {
  const monthDate = useMemo(() => parseMonth(visibleMonth), [visibleMonth]);
  const monthCells = useMemo(() => buildMonthMatrix(visibleMonth), [visibleMonth]);
  const statusMap = useMemo(() => buildStatusMap(appointments), [appointments]);
  const today = useMemo(() => toDateValue(new Date()), []);
  const monthLabel = monthDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const goToMonth = (delta: number) => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1);
    onMonthChange(toMonthValue(next));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3.5 py-3 shadow-[0_14px_26px_-28px_rgba(15,23,42,0.28)] sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => goToMonth(-1)} className="h-9 w-9 rounded-full px-0 shadow-none">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-base font-semibold capitalize tracking-tight app-text">{monthLabel}</div>
            <div className="text-[11px] leading-4 app-text-muted">Toca un dia para ver su detalle</div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => goToMonth(1)} className="h-9 w-9 rounded-full px-0 shadow-none">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-[24px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-2.5 py-3 shadow-[0_18px_34px_-34px_rgba(15,23,42,0.34)] sm:px-3.5">
        <div className="grid grid-cols-7 gap-1.5 pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] app-text-muted sm:text-[11px]">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
        {monthCells.map((cell) => {
          const isSelected = cell.iso === selectedDate;
          const isToday = cell.iso === today;
          const counts = statusMap[cell.iso];
          const total = counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : 0;
          const statusOrder: AppointmentStatus[] = ['scheduled', 'completed', 'cancelled', 'no_show'];
          const activeStatuses = statusOrder.filter((status) => counts && counts[status] > 0);
          const dominantStatus = activeStatuses[0] || null;

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso)}
              className={cn(
                'min-w-0 overflow-hidden rounded-[16px] border px-1.5 py-1.5 text-left transition-all',
                'min-h-[4.55rem] sm:min-h-[4.85rem]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                cell.inMonth
                  ? 'border-[color:var(--app-border)] bg-[color:var(--app-surface)] opacity-100'
                  : 'border-transparent bg-[color:var(--app-canvas)] opacity-42',
                isSelected
                  ? 'border-[color:var(--app-primary-soft-border)] bg-[color:var(--app-primary-soft)] shadow-[0_16px_24px_-28px_rgba(37,99,235,0.4)]'
                  : 'hover:border-[color:var(--app-primary-soft-border)] hover:bg-[color:var(--app-surface-soft)]',
              )}
              aria-pressed={isSelected}
            >
              <div className="flex h-full min-w-0 flex-col">
                <div className="flex items-start justify-between gap-1">
                  <span className={cn('text-[12px] font-semibold tracking-tight sm:text-[13px]', isSelected ? 'text-[color:var(--app-primary)]' : 'app-text')}>
                  {cell.date.getDate()}
                  </span>
                  {isToday ? (
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="Hoy" />
                  ) : <span className="h-2 w-2 shrink-0" aria-hidden="true" />}
                </div>

                <div className="mt-auto min-w-0 space-y-1">
                  {activeStatuses.length ? (
                    <>
                      <div className="flex items-center gap-1">
                        {activeStatuses.slice(0, 3).map((status) => (
                          <span key={status} className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASS[status])} aria-label={STATUS_LABEL[status]} />
                        ))}
                        {activeStatuses.length > 3 ? <span className="text-[8px] font-semibold app-text-muted">+{activeStatuses.length - 3}</span> : null}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            'inline-flex max-w-full rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none',
                            dominantStatus
                              ? `${STATUS_DOT_CLASS[dominantStatus]} text-white`
                              : 'bg-[color:var(--app-surface-soft)] app-text-secondary',
                          )}
                        >
                          {total}
                        </span>
                        {total > 0 ? (
                          <span className="truncate text-[8px] font-medium uppercase tracking-[0.08em] app-text-muted">
                            citas
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="h-4 rounded-full bg-[color:var(--app-surface-soft)]/55" aria-hidden="true" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
        </div>
      </div>

      <div className="rounded-[22px] border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] app-text-muted">
          {(['scheduled', 'completed', 'cancelled', 'no_show'] as AppointmentStatus[]).map((status) => (
            <div key={status} className="inline-flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_CLASS[status])} />
              <span>{STATUS_LABEL[status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
