import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export type PeriodPreset = '7d' | '15d' | '30d' | 'month' | 'year' | 'custom';

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

  // Default: Last 7 days
  const defaultRange = getPeriodRange('7d');
  return { preset: '7d', ...defaultRange };
};
