import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { MobileBottomSheet } from '../mobile/MobileContentFirst';

export interface PeriodRibbonOption<T extends string = string> {
  id: T;
  label: string;
  shortLabel?: string;
}

interface PeriodRibbonProps<T extends string = string> {
  value: T;
  options: Array<PeriodRibbonOption<T>>;
  label: string;
  rangeLabel: string;
  onChange: (value: T) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onOpenCalendar?: () => void;
  customRangeContent?: React.ReactNode;
  isCustomOpen?: boolean;
  onCustomOpenChange?: (open: boolean) => void;
  canNavigate?: boolean;
  className?: string;
  menuTitle?: string;
  calendarLabel?: string;
}

export const PeriodRibbon = <T extends string = string>({
  value,
  options,
  label,
  rangeLabel,
  onChange,
  onPrev,
  onNext,
  onOpenCalendar,
  customRangeContent,
  isCustomOpen = false,
  onCustomOpenChange,
  canNavigate = true,
  className,
  menuTitle = 'Seleccionar vista',
  calendarLabel = 'Calendario',
}: PeriodRibbonProps<T>) => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.id === value) || options[0];

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = () => setIsDesktop(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!isMenuOpen || !isDesktop) return undefined;

    const updateMenuPosition = () => {
      const element = triggerRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const menuWidth = Math.min(320, Math.max(260, rect.width));
      const left = Math.min(
        Math.max(12, rect.left),
        Math.max(12, viewportWidth - menuWidth - 12),
      );

      setMenuPos({
        top: rect.bottom + 10,
        left,
        width: menuWidth,
      });
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsMenuOpen(false);
      }
    };

    updateMenuPosition();
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isDesktop, isMenuOpen]);

  const openCustomRange = () => {
    onOpenCalendar?.();
    onCustomOpenChange?.(true);
  };

  const handleOptionSelect = (optionValue: T) => {
    onChange(optionValue);
    setIsMenuOpen(false);
  };

  const menuContent = (
    <div className="space-y-2">
      <div className="px-1 text-xs font-semibold uppercase tracking-[0.14em] app-text-muted">
        Granularidad
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {options.map((option) => {
          const isActive = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionSelect(option.id)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all',
                isActive
                  ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-200'
                  : 'border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]',
              )}
            >
              <span className="font-medium">{option.label}</span>
              {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className={cn('app-period-stack', className)}>
        <div className="app-period-ribbon">
          <div ref={triggerRef} className="min-w-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              className="app-period-granularity"
              aria-expanded={isMenuOpen}
              aria-label={label}
            >
              <span className="truncate">{selectedOption?.label || label}</span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isMenuOpen && 'rotate-180')} />
            </button>
          </div>

          <div className="app-period-ribbon__center">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canNavigate || !onPrev}
              className="app-period-nav"
              aria-label="Periodo anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="app-period-chip" aria-live="polite">
              <span className="app-period-chip__label truncate">{rangeLabel}</span>
            </div>

            <button
              type="button"
              onClick={onNext}
              disabled={!canNavigate || !onNext}
              className="app-period-nav"
              aria-label="Siguiente periodo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button type="button" onClick={openCustomRange} className="app-period-calendar" aria-label={calendarLabel}>
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="hidden xl:inline">{calendarLabel}</span>
          </button>
        </div>

        {isDesktop && isCustomOpen && customRangeContent ? (
          <div className="app-period-custom-panel hidden lg:block">
            {customRangeContent}
          </div>
        ) : null}
      </div>

      {isDesktop && isMenuOpen
        ? createPortal(
            <div
              ref={menuRef}
              className="app-surface overflow-hidden rounded-[24px] p-3 shadow-2xl"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                zIndex: 9999,
              }}
            >
              {menuContent}
            </div>,
            document.body,
          )
        : null}

      {!isDesktop ? (
        <>
          <MobileBottomSheet
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            title={menuTitle}
            bodyClassName="space-y-4"
          >
            {menuContent}
          </MobileBottomSheet>

          <MobileBottomSheet
            isOpen={Boolean(isCustomOpen && customRangeContent)}
            onClose={() => onCustomOpenChange?.(false)}
            title={calendarLabel}
            bodyClassName="space-y-4"
          >
            {customRangeContent}
          </MobileBottomSheet>
        </>
      ) : null}
    </>
  );
};
