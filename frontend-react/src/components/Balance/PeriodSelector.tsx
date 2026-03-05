import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Calendar, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addMonths, addYears, subDays, subMonths, subYears, isSameMonth, isSameYear, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

export type PeriodType = 'daily' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

interface PeriodSelectorProps {
  period: PeriodType;
  onChangePeriod: (period: PeriodType) => void;
  startDate: Date;
  endDate: Date;
  onChangeDateRange: (start: Date, end: Date) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  period,
  onChangePeriod,
  startDate,
  endDate,
  onChangeDateRange
}) => {
  const [anchorDate, setAnchorDate] = useState(new Date());

  // Reset anchor when period changes
  useEffect(() => {
    setAnchorDate(new Date());
    calculateRange(new Date(), period);
  }, [period]);

  const calculateRange = (baseDate: Date, type: PeriodType) => {
    let start = baseDate;
    let end = baseDate;

    switch (type) {
      case 'daily':
        start = startOfDay(baseDate);
        end = endOfDay(baseDate);
        break;
      case 'biweekly':
        if (baseDate.getDate() <= 15) {
            start = startOfMonth(baseDate);
            end = new Date(baseDate.getFullYear(), baseDate.getMonth(), 15, 23, 59, 59);
        } else {
            start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 16, 0, 0, 0);
            end = endOfMonth(baseDate);
        }
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
        // Keep existing range or do nothing
        return;
    }
    onChangeDateRange(start, end);
  };

  const handlePrev = () => {
    let newDate = new Date(anchorDate);
    switch (period) {
      case 'daily': newDate = subDays(newDate, 1); break;
      case 'biweekly': newDate = subDays(newDate, 15); break; // Rough approx, refine logic if needed
      case 'monthly': newDate = subMonths(newDate, 1); break;
      case 'yearly': newDate = subYears(newDate, 1); break;
    }
    setAnchorDate(newDate);
    calculateRange(newDate, period);
  };

  const handleNext = () => {
    let newDate = new Date(anchorDate);
    switch (period) {
      case 'daily': newDate = addDays(newDate, 1); break;
      case 'biweekly': newDate = addDays(newDate, 15); break;
      case 'monthly': newDate = addMonths(newDate, 1); break;
      case 'yearly': newDate = addYears(newDate, 1); break;
    }
    setAnchorDate(newDate);
    calculateRange(newDate, period);
  };

  const getLabel = () => {
    if (period === 'daily') return format(anchorDate, "EEEE, d 'de' MMMM", { locale: es });
    if (period === 'biweekly') {
        const isFirstHalf = anchorDate.getDate() <= 15;
        return `${isFirstHalf ? '1ª Quincena' : '2ª Quincena'} de ${format(anchorDate, 'MMMM yyyy', { locale: es })}`;
    }
    if (period === 'monthly') return format(anchorDate, 'MMMM yyyy', { locale: es });
    if (period === 'yearly') return format(anchorDate, 'yyyy', { locale: es });
    if (period === 'custom') return `${format(startDate, 'dd/MM/yy')} - ${format(endDate, 'dd/MM/yy')}`;
    return '';
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Period Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg overflow-x-auto max-w-full">
          {(['daily', 'biweekly', 'monthly', 'yearly', 'custom'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => onChangePeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                period === p
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {p === 'daily' ? 'Diario' : 
               p === 'biweekly' ? 'Quincenal' : 
               p === 'monthly' ? 'Mensual' : 
               p === 'yearly' ? 'Anual' : 'Personalizado'}
            </button>
          ))}
        </div>

        {/* Date Slider Controls */}
        {period !== 'custom' ? (
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/30 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700/50 w-full md:w-auto justify-between md:justify-center">
            <button onClick={handlePrev} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            
            <span className="text-sm font-semibold text-gray-800 dark:text-white capitalize min-w-[150px] text-center">
              {getLabel()}
            </span>

            <button onClick={handleNext} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={(e) => onChangeDateRange(new Date(e.target.value), endDate)}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              value={format(endDate, 'yyyy-MM-dd')}
              onChange={(e) => onChangeDateRange(startDate, new Date(e.target.value))}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};
