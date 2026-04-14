import React from 'react';
import type { Appointment } from '../../types';
import { formatCOP } from './helpers';

interface AgendaKpisProps {
  appointments: Appointment[];
}

export const AgendaKpis: React.FC<AgendaKpisProps> = ({ appointments }) => {
  const scheduled = appointments.filter((a) => a.status === 'scheduled').length;
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
  const noShow = appointments.filter((a) => a.status === 'no_show').length;
  const revenue = appointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + (a.price_snapshot || 0), 0);

  const cards = [
    { label: 'Agendadas', value: String(scheduled), tone: 'text-blue-600 dark:text-blue-400' },
    { label: 'Completadas', value: String(completed), tone: 'text-green-600 dark:text-green-400' },
    { label: 'Canceladas', value: String(cancelled + noShow), tone: 'text-red-500 dark:text-red-400' },
    { label: 'Ingresos', value: formatCOP(revenue), tone: 'app-text' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {cards.map((card) => (
        <div key={card.label} className="app-section-card rounded-2xl px-3.5 py-3">
          <div className="text-[11px] font-medium app-text-muted sm:text-xs">{card.label}</div>
          <div className={`mt-1 text-base font-bold tabular-nums ${card.tone} sm:text-lg`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
};
