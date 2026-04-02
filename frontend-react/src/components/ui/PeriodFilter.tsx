import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DateRange,
  PeriodPreset,
  getPeriodPreference,
  getPeriodRange,
  savePeriodPreference,
  shiftPeriodRange,
} from '../../utils/dateRange.utils';
import { Input } from './Input';
import { PeriodRibbon, type PeriodRibbonOption } from './PeriodRibbon';

interface PeriodFilterProps {
  moduleId: string;
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  buttonClassName?: string;
  iconOnly?: boolean;
  mode?: 'full' | 'customOnly';
}

const PERIOD_OPTIONS: Array<PeriodRibbonOption<PeriodPreset>> = [
  { id: 'today', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'biweekly', label: 'Quincenal' },
  { id: 'month', label: 'Mensual' },
  { id: 'year', label: 'Anual' },
  { id: 'custom', label: 'Personalizado' },
];

const buildLegacyFallback = (range: DateRange): DateRange => {
  if (range.preset === '7d') return { ...getPeriodRange('week'), preset: 'week' };
  if (range.preset === '15d') return { ...getPeriodRange('biweekly'), preset: 'biweekly' };
  if (range.preset === '30d') return { ...getPeriodRange('month'), preset: 'month' };
  return range;
};

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  moduleId,
  value,
  onChange,
  className = '',
  mode = 'full',
}) => {
  const [internalRange, setInternalRange] = useState<DateRange>(() => buildLegacyFallback(getPeriodPreference(moduleId)));
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);

  useEffect(() => {
    if (value) {
      const normalizedRange = buildLegacyFallback(value);
      setInternalRange(normalizedRange);
      if (
        normalizedRange.preset !== value.preset ||
        normalizedRange.start !== value.start ||
        normalizedRange.end !== value.end
      ) {
        onChange(normalizedRange);
      }
    }
  }, [value]);

  useEffect(() => {
    if (!value) {
      onChange(internalRange);
    }
  }, []);

  const applyRange = (nextRange: DateRange, shouldPersist = true) => {
    setInternalRange(nextRange);
    if (shouldPersist) {
      savePeriodPreference(
        moduleId,
        nextRange.preset,
        nextRange.preset === 'custom'
          ? { start: nextRange.start, end: nextRange.end }
          : undefined,
      );
    }
    onChange(nextRange);
  };

  const handlePresetChange = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      const nextRange = { ...internalRange, preset: 'custom' as PeriodPreset };
      setInternalRange(nextRange);
      setIsCustomRangeOpen(true);
      return;
    }

    const periodRange = getPeriodRange(preset);
    applyRange({ ...periodRange, preset });
    setIsCustomRangeOpen(false);
  };

  const handleShift = (direction: 'prev' | 'next') => {
    if (internalRange.preset === 'custom') return;
    const shifted = shiftPeriodRange(
      internalRange.preset,
      { start: internalRange.start, end: internalRange.end },
      direction,
    );
    applyRange({ ...shifted, preset: internalRange.preset });
  };

  const formatVisibleRange = useMemo(() => {
    const start = new Date(`${internalRange.start}T12:00:00`);
    const end = new Date(`${internalRange.end}T12:00:00`);

    switch (internalRange.preset) {
      case 'today':
        return format(start, "d 'de' MMMM yyyy", { locale: es });
      case 'week':
        return `${format(start, "d MMM", { locale: es })} - ${format(end, "d MMM yyyy", { locale: es })}`;
      case 'biweekly':
        return `${format(start, "d MMM", { locale: es })} - ${format(end, "d MMM yyyy", { locale: es })}`;
      case 'month':
        return format(start, 'MMMM yyyy', { locale: es });
      case 'year':
        return format(start, 'yyyy', { locale: es });
      case 'custom':
        return `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
      default:
        return `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
    }
  }, [internalRange.end, internalRange.preset, internalRange.start]);

  const customRangeContent = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Input
        label="Desde"
        type="date"
        value={internalRange.start}
        onChange={(event) => {
          const nextRange = { ...internalRange, start: event.target.value, preset: 'custom' as PeriodPreset };
          setInternalRange(nextRange);
          applyRange(nextRange, false);
        }}
      />
      <Input
        label="Hasta"
        type="date"
        value={internalRange.end}
        onChange={(event) => {
          const nextRange = { ...internalRange, end: event.target.value, preset: 'custom' as PeriodPreset };
          setInternalRange(nextRange);
          applyRange(nextRange, false);
        }}
      />
    </div>
  );

  const resolvedOptions = mode === 'customOnly'
    ? PERIOD_OPTIONS.filter((option) => option.id === 'custom')
    : PERIOD_OPTIONS;

  return (
    <PeriodRibbon
      value={mode === 'customOnly' ? 'custom' : internalRange.preset}
      options={resolvedOptions}
      label="Granularidad del periodo"
      rangeLabel={formatVisibleRange}
      onChange={handlePresetChange}
      onPrev={internalRange.preset === 'custom' ? undefined : () => handleShift('prev')}
      onNext={internalRange.preset === 'custom' ? undefined : () => handleShift('next')}
      onOpenCalendar={() => {
        if (internalRange.preset !== 'custom') {
          const nextRange = { ...internalRange, preset: 'custom' as PeriodPreset };
          setInternalRange(nextRange);
        }
      }}
      customRangeContent={customRangeContent}
      isCustomOpen={isCustomRangeOpen || internalRange.preset === 'custom'}
      onCustomOpenChange={setIsCustomRangeOpen}
      canNavigate={internalRange.preset !== 'custom'}
      className={className}
      menuTitle="Seleccionar periodo"
      calendarLabel="Rango"
    />
  );
};
