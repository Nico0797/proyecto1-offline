import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';

type SheetOption = {
  value: string;
  label: string;
  disabled: boolean;
};

const isMobileViewport = () => {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(min-width: 1024px)').matches;
};

const getSelectTitle = (select: HTMLSelectElement) => {
  const label = select.labels?.[0]?.textContent?.trim();
  return label || select.getAttribute('aria-label') || select.title || 'Seleccionar';
};

const getSelectOptions = (select: HTMLSelectElement): SheetOption[] =>
  Array.from(select.options).map((option) => ({
    value: option.value,
    label: option.label || option.text,
    disabled: option.disabled || Boolean(option.parentElement && option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled),
  }));

export const GlobalSelectSheet: React.FC = () => {
  const [activeSelect, setActiveSelect] = useState<HTMLSelectElement | null>(null);

  useEffect(() => {
    const shouldEnhance = (select: HTMLSelectElement) =>
      isMobileViewport() &&
      select.matches('select.app-select') &&
      !select.disabled &&
      !select.multiple &&
      !select.closest('[data-native-select="true"]');

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const select = target?.closest('select.app-select');
      if (!(select instanceof HTMLSelectElement) || !shouldEnhance(select)) return;

      event.preventDefault();
      event.stopPropagation();
      select.focus({ preventScroll: true });
      setActiveSelect(select);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const select = target?.closest('select.app-select');
      if (!(select instanceof HTMLSelectElement) || !shouldEnhance(select)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const select = document.activeElement;
      if (!(select instanceof HTMLSelectElement) || !shouldEnhance(select)) return;

      event.preventDefault();
      setActiveSelect(select);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    if (!activeSelect) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveSelect(null);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeSelect]);

  const options = useMemo(() => (activeSelect ? getSelectOptions(activeSelect) : []), [activeSelect]);
  const value = activeSelect?.value ?? '';
  const title = activeSelect ? getSelectTitle(activeSelect) : 'Seleccionar';

  const handleSelect = (nextValue: string) => {
    if (!activeSelect) return;

    activeSelect.value = nextValue;
    activeSelect.dispatchEvent(new Event('input', { bubbles: true }));
    activeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    activeSelect.focus({ preventScroll: true });
    setActiveSelect(null);
  };

  if (!activeSelect) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6">
      <button
        type="button"
        className="app-overlay-backdrop fixed inset-0"
        onClick={() => setActiveSelect(null)}
        aria-label="Cerrar selector"
      />
      <div className="app-surface relative flex w-full max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden rounded-t-[28px] shadow-[var(--app-shadow-strong)] sm:max-h-[70vh] sm:max-w-md sm:rounded-[28px]">
        <div className="app-page-header sticky top-0 z-10 flex items-center justify-between border-b app-divider px-5 py-4">
          <h3 className="min-w-0 truncate text-base font-semibold app-text">{title}</h3>
          <button
            type="button"
            onClick={() => setActiveSelect(null)}
            className="app-icon-button rounded-lg p-2 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                onClick={() => {
                  if (!option.disabled) handleSelect(option.value);
                }}
                disabled={option.disabled}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                  isActive
                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-200'
                    : 'border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]',
                  option.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className={cn('min-w-0 truncate text-sm', isActive ? 'font-semibold' : 'font-medium')}>
                  {option.label}
                </span>
                {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
};
