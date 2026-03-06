import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown } from 'lucide-react';
import { DateRange, PeriodPreset, getPeriodRange, savePeriodPreference, getPeriodPreference } from '../../utils/dateRange.utils';
import { Button } from './Button';
import { Input } from './Input';

interface PeriodFilterProps {
  moduleId: string; // Key for localStorage persistence
  value?: DateRange; // Controlled component if needed, otherwise uses internal state + persistence
  onChange: (range: DateRange) => void;
  className?: string;
  iconOnly?: boolean;
  mode?: 'full' | 'customOnly';
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({ 
  moduleId, 
  value, 
  onChange,
  className = '',
  iconOnly = false,
  mode = 'full'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{top:number; left:number; width:number}>({ top: 0, left: 0, width: 256 });
  const [internalRange, setInternalRange] = useState<DateRange>(() => getPeriodPreference(moduleId));
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync with prop if provided
  useEffect(() => {
    if (value) {
      setInternalRange(value);
    }
  }, [value]);

  // Initial load effect to notify parent of default value if not controlled
  useEffect(() => {
    if (!value) {
      onChange(internalRange);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(t) &&
        (!menuRef.current || !menuRef.current.contains(t))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Positioning for portal menu
  const updateMenuPos = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = rect.bottom + 8; // below button
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(0, (window.innerWidth || document.documentElement.clientWidth) - 272 - 8)
    );
    setMenuPos({ top, left, width: 256 });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPos();
    const onResize = () => updateMenuPos();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [isOpen]);

  const handlePresetChange = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      const newRange = { ...internalRange, preset: 'custom' as PeriodPreset };
      setInternalRange(newRange);
      // Don't close dropdown yet, let user pick dates
    } else {
      const { start, end } = getPeriodRange(preset);
      const newRange = { start, end, preset };
      setInternalRange(newRange);
      savePeriodPreference(moduleId, preset);
      onChange(newRange);
      setIsOpen(false);
    }
  };

  const handleCustomDateChange = (field: 'start' | 'end', val: string) => {
    const newRange = { ...internalRange, [field]: val, preset: 'custom' as PeriodPreset };
    setInternalRange(newRange);
  };

  const applyCustomRange = () => {
    // Validate
    if (new Date(internalRange.start) > new Date(internalRange.end)) {
      alert('La fecha de inicio no puede ser mayor a la fecha fin');
      return;
    }
    savePeriodPreference(moduleId, 'custom', { start: internalRange.start, end: internalRange.end });
    onChange(internalRange);
    setIsOpen(false);
  };

  const getLabel = () => {
    switch (internalRange.preset) {
      case '7d': return 'Últimos 7 días';
      case '15d': return 'Últimos 15 días';
      case '30d': return 'Últimos 30 días';
      case 'month': return 'Este Mes';
      case 'year': return 'Este Año';
      case 'custom': return `${internalRange.start} - ${internalRange.end}`;
      default: return 'Periodo';
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <Button 
        variant="secondary" 
        onClick={() => { 
          if (!isOpen && mode === 'customOnly') {
            setInternalRange(prev => ({ ...prev, preset: 'custom' as PeriodPreset }));
          }
          setIsOpen(!isOpen); 
        }}
        className={
          iconOnly 
            ? "flex items-center justify-center h-10 w-10 p-0" 
            : "flex items-center gap-2 min-w-[180px] justify-between"
        }
        aria-label="Filtrar por período"
      >
        {iconOnly ? (
          <Calendar className="w-5 h-5" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{getLabel()}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </Button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 9999 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          {mode === 'full' && (
            <div className="p-2 flex flex-col gap-1">
              {[
                { id: '7d', label: 'Últimos 7 días' },
                { id: '15d', label: 'Últimos 15 días' },
                { id: '30d', label: 'Últimos 30 días' },
                { id: 'month', label: 'Este Mes' },
                { id: 'year', label: 'Este Año' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handlePresetChange(opt.id as PeriodPreset)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    internalRange.preset === opt.id 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              
              <button
                onClick={() => handlePresetChange('custom')}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  internalRange.preset === 'custom'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Personalizado
              </button>
            </div>
          )}

          {internalRange.preset === 'custom' && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Desde</label>
                  <Input 
                    type="date" 
                    value={internalRange.start} 
                    onChange={(e) => handleCustomDateChange('start', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Hasta</label>
                  <Input 
                    type="date" 
                    value={internalRange.end} 
                    onChange={(e) => handleCustomDateChange('end', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button size="sm" onClick={applyCustomRange} className="mt-2 w-full">
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
