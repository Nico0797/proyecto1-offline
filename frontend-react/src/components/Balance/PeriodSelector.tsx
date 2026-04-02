import React, { useEffect, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '../ui/Input';
import { PeriodRibbon, type PeriodRibbonOption } from '../ui/PeriodRibbon';

export type PeriodType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

interface PeriodSelectorProps {
  period: PeriodType;
  onChangePeriod: (period: PeriodType) => void;
  startDate: Date;
  endDate: Date;
  onChangeDateRange: (start: Date, end: Date) => void;
}

const PERIOD_OPTIONS: Array<PeriodRibbonOption<PeriodType>> = [
  { id: 'daily', label: 'Dia' },
  { id: 'weekly', label: 'Semana' },
  { id: 'biweekly', label: 'Quincenal' },
  { id: 'monthly', label: 'Mensual' },
  { id: 'yearly', label: 'Anual' },
  { id: 'custom', label: 'Personalizado' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  period,
  onChangePeriod,
  startDate,
  endDate,
  onChangeDateRange,
}) => {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(period === 'custom');

  const parseDateInput = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  const getBiweeklyRange = (baseDate: Date) => {
    if (baseDate.getDate() <= 15) {
      return {
        start: new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0),
        end: new Date(baseDate.getFullYear(), baseDate.getMonth(), 15, 23, 59, 59, 999),
      };
    }

    return {
      start: new Date(baseDate.getFullYear(), baseDate.getMonth(), 16, 0, 0, 0, 0),
      end: endOfMonth(baseDate),
    };
  };

  const shiftBiweeklyAnchor = (currentAnchor: Date, direction: 'prev' | 'next') => {
    const day = currentAnchor.getDate();
    if (direction === 'prev') {
      if (day <= 15) {
        return new Date(currentAnchor.getFullYear(), currentAnchor.getMonth() - 1, 16, 12, 0, 0, 0);
      }
      return new Date(currentAnchor.getFullYear(), currentAnchor.getMonth(), 1, 12, 0, 0, 0);
    }

    if (day <= 15) {
      return new Date(currentAnchor.getFullYear(), currentAnchor.getMonth(), 16, 12, 0, 0, 0);
    }
    return new Date(currentAnchor.getFullYear(), currentAnchor.getMonth() + 1, 1, 12, 0, 0, 0);
  };

  const calculateRange = (baseDate: Date, type: PeriodType) => {
    let start = baseDate;
    let end = baseDate;

    switch (type) {
      case 'daily':
        start = startOfDay(baseDate);
        end = endOfDay(baseDate);
        break;
      case 'weekly':
        start = startOfWeek(baseDate, { locale: es, weekStartsOn: 1 });
        end = endOfWeek(baseDate, { locale: es, weekStartsOn: 1 });
        break;
      case 'biweekly':
        ({ start, end } = getBiweeklyRange(baseDate));
        break;
      case 'monthly':
        start = startOfMonth(baseDate);
        end = endOfMonth(baseDate);
        break;
      case 'yearly':
        start = startOfYear(baseDate);
        end = endOfYear(baseDate);
        break;
      case 'custom':
        return;
    }

    onChangeDateRange(start, end);
  };

  useEffect(() => {
    if (period === 'custom') {
      setIsCustomRangeOpen(true);
      return;
    }

    const currentDate = new Date();
    setAnchorDate(currentDate);
    setIsCustomRangeOpen(false);
    calculateRange(currentDate, period);
  }, [period]);

  const handlePrev = () => {
    let newDate = new Date(anchorDate);

    switch (period) {
      case 'daily':
        newDate = subDays(newDate, 1);
        break;
      case 'weekly':
        newDate = subWeeks(newDate, 1);
        break;
      case 'biweekly':
        newDate = shiftBiweeklyAnchor(newDate, 'prev');
        break;
      case 'monthly':
        newDate = subMonths(newDate, 1);
        break;
      case 'yearly':
        newDate = subYears(newDate, 1);
        break;
      default:
        return;
    }

    setAnchorDate(newDate);
    calculateRange(newDate, period);
  };

  const handleNext = () => {
    let newDate = new Date(anchorDate);

    switch (period) {
      case 'daily':
        newDate = addDays(newDate, 1);
        break;
      case 'weekly':
        newDate = addWeeks(newDate, 1);
        break;
      case 'biweekly':
        newDate = shiftBiweeklyAnchor(newDate, 'next');
        break;
      case 'monthly':
        newDate = addMonths(newDate, 1);
        break;
      case 'yearly':
        newDate = addYears(newDate, 1);
        break;
      default:
        return;
    }

    setAnchorDate(newDate);
    calculateRange(newDate, period);
  };

  const getLabel = () => {
    if (period === 'daily') return format(anchorDate, "d 'de' MMMM yyyy", { locale: es });
    if (period === 'weekly') {
      return `${format(startDate, "d MMM", { locale: es })} - ${format(endDate, "d MMM yyyy", { locale: es })}`;
    }
    if (period === 'biweekly') {
      const isFirstHalf = anchorDate.getDate() <= 15;
      return `${isFirstHalf ? '1ra quincena' : '2da quincena'} de ${format(anchorDate, 'MMMM yyyy', { locale: es })}`;
    }
    if (period === 'monthly') return format(anchorDate, 'MMMM yyyy', { locale: es });
    if (period === 'yearly') return format(anchorDate, 'yyyy', { locale: es });
    return `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
  };

  const customRangeContent = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Input
        label="Desde"
        type="date"
        value={format(startDate, 'yyyy-MM-dd')}
        onChange={(event) => {
          const parsed = parseDateInput(event.target.value);
          if (parsed) onChangeDateRange(parsed, endDate);
        }}
      />
      <Input
        label="Hasta"
        type="date"
        value={format(endDate, 'yyyy-MM-dd')}
        onChange={(event) => {
          const parsed = parseDateInput(event.target.value);
          if (parsed) onChangeDateRange(startDate, parsed);
        }}
      />
    </div>
  );

  return (
    <PeriodRibbon
      value={period}
      options={PERIOD_OPTIONS}
      label="Granularidad del periodo"
      rangeLabel={getLabel()}
      onChange={(nextPeriod) => {
        onChangePeriod(nextPeriod);
        if (nextPeriod === 'custom') {
          setIsCustomRangeOpen(true);
        }
      }}
      onPrev={period === 'custom' ? undefined : handlePrev}
      onNext={period === 'custom' ? undefined : handleNext}
      onOpenCalendar={() => {
        if (period !== 'custom') {
          onChangePeriod('custom');
        }
      }}
      customRangeContent={customRangeContent}
      isCustomOpen={isCustomRangeOpen}
      onCustomOpenChange={setIsCustomRangeOpen}
      canNavigate={period !== 'custom'}
      menuTitle="Seleccionar periodo"
      calendarLabel="Rango"
    />
  );
};
