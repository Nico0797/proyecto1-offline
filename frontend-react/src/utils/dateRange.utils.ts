import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type PeriodPreset =
  | 'today'
  | '7d'
  | '15d'
  | '30d'
  | 'week'
  | 'biweekly'
  | 'month'
  | 'year'
  | 'custom';

export interface DateRange {
  start: string;
  end: string;
  preset: PeriodPreset;
}

export const toISODate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const getPeriodRange = (preset: PeriodPreset): { start: string; end: string } => {
  const now = new Date();
  let start = now;
  let end = now;

  switch (preset) {
    case 'today':
      start = now;
      end = now;
      break;
    case '7d':
      start = subDays(now, 6); // Includes today
      end = now;
      break;
    case '15d':
      start = subDays(now, 14);
      end = now;
      break;
    case '30d':
      start = subDays(now, 29);
      end = now;
      break;
    case 'week':
      start = startOfWeek(now, { locale: es, weekStartsOn: 1 });
      end = endOfWeek(now, { locale: es, weekStartsOn: 1 });
      break;
    case 'biweekly':
      if (now.getDate() <= 15) {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth(), 15);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 16);
        end = endOfMonth(now);
      }
      break;
    case 'month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'year':
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    case 'custom':
      // Default to today if custom is selected but no range provided yet
      start = now;
      end = now;
      break;
  }

  return {
    start: toISODate(start),
    end: toISODate(end),
  };
};

export const shiftPeriodRange = (
  preset: PeriodPreset,
  currentRange: { start: string; end: string },
  direction: 'prev' | 'next',
): { start: string; end: string } => {
  const delta = direction === 'next' ? 1 : -1;
  const currentStart = new Date(`${currentRange.start}T12:00:00`);

  switch (preset) {
    case 'today': {
      const next = addDays(currentStart, delta);
      return { start: toISODate(next), end: toISODate(next) };
    }
    case 'week': {
      const next = addWeeks(currentStart, delta);
      return {
        start: toISODate(startOfWeek(next, { locale: es, weekStartsOn: 1 })),
        end: toISODate(endOfWeek(next, { locale: es, weekStartsOn: 1 })),
      };
    }
    case 'biweekly': {
      const day = currentStart.getDate();
      let nextAnchor = currentStart;
      if (delta < 0) {
        nextAnchor = day <= 15
          ? new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 16, 12, 0, 0, 0)
          : new Date(currentStart.getFullYear(), currentStart.getMonth(), 1, 12, 0, 0, 0);
      } else {
        nextAnchor = day <= 15
          ? new Date(currentStart.getFullYear(), currentStart.getMonth(), 16, 12, 0, 0, 0)
          : new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1, 12, 0, 0, 0);
      }
      return getPeriodRangeForDate('biweekly', nextAnchor);
    }
    case 'month': {
      return getPeriodRangeForDate('month', addMonths(currentStart, delta));
    }
    case 'year': {
      return getPeriodRangeForDate('year', addYears(currentStart, delta));
    }
    case '7d':
    case '15d':
    case '30d': {
      const windowSize = preset === '7d' ? 7 : preset === '15d' ? 15 : 30;
      const nextStart = addDays(currentStart, delta * windowSize);
      const nextEnd = addDays(nextStart, windowSize - 1);
      return { start: toISODate(nextStart), end: toISODate(nextEnd) };
    }
    case 'custom':
    default:
      return currentRange;
  }
};

export const getPeriodRangeForDate = (preset: Exclude<PeriodPreset, 'custom'>, date: Date): { start: string; end: string } => {
  if (preset === 'week') {
    return {
      start: toISODate(startOfWeek(date, { locale: es, weekStartsOn: 1 })),
      end: toISODate(endOfWeek(date, { locale: es, weekStartsOn: 1 })),
    };
  }
  if (preset === 'biweekly') {
    if (date.getDate() <= 15) {
      return {
        start: toISODate(new Date(date.getFullYear(), date.getMonth(), 1)),
        end: toISODate(new Date(date.getFullYear(), date.getMonth(), 15)),
      };
    }
    return {
      start: toISODate(new Date(date.getFullYear(), date.getMonth(), 16)),
      end: toISODate(endOfMonth(date)),
    };
  }
  if (preset === 'month') {
    return {
      start: toISODate(startOfMonth(date)),
      end: toISODate(endOfMonth(date)),
    };
  }
  if (preset === 'year') {
    return {
      start: toISODate(startOfYear(date)),
      end: toISODate(endOfYear(date)),
    };
  }
  if (preset === 'today') {
    return { start: toISODate(date), end: toISODate(date) };
  }
  if (preset === '7d' || preset === '15d' || preset === '30d') {
    const days = preset === '7d' ? 6 : preset === '15d' ? 14 : 29;
    return {
      start: toISODate(subDays(date, days)),
      end: toISODate(date),
    };
  }
  return getPeriodRange(preset);
};

export const savePeriodPreference = (moduleId: string, preset: PeriodPreset, customRange?: { start: string; end: string }) => {
  const key = `encaja:period:${moduleId}`;
  const data = {
    preset,
    customRange: preset === 'custom' ? customRange : undefined
  };
  localStorage.setItem(key, JSON.stringify(data));
};

export const getPeriodPreference = (moduleId: string): DateRange => {
  const key = `encaja:period:${moduleId}`;
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      const { preset, customRange } = JSON.parse(stored);
      if (preset === 'custom' && customRange) {
        return { preset, ...customRange };
      }
      const range = getPeriodRange(preset);
      return { preset, ...range };
    } catch (e) {
      console.warn('Error parsing stored period preference', e);
    }
  }

  const defaultRange = getPeriodRange('month');
  return { preset: 'month', ...defaultRange };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
