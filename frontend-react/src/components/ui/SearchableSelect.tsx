import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  secondary?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | number | '';
  onChange: (value: string | number | '') => void;
  placeholder?: string;
  label?: string;
  helper?: string;
  icon?: React.ElementType;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  allowClear?: boolean;
  sheetTitle?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  helper,
  icon: Icon,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No se encontraron resultados',
  required,
  disabled,
  className,
  wrapperClassName,
  allowClear = true,
  sheetTitle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    const list = term
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(term) ||
            (o.secondary && o.secondary.toLowerCase().includes(term))
        )
      : [...options];
    return list.sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [options, search]);

  const handleSelect = useCallback(
    (opt: SearchableSelectOption) => {
      onChange(opt.value);
      setIsOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange('');
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const panel = isOpen
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6">
          <div
            className="app-overlay-backdrop fixed inset-0 transition-opacity"
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
            aria-hidden="true"
          />
          <div className="app-surface relative flex w-full max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden rounded-t-[28px] shadow-[var(--app-shadow-strong)] sm:max-h-[70vh] sm:max-w-md sm:rounded-[28px]">
            {/* Header */}
            <div className="app-page-header sticky top-0 z-10 border-b app-divider">
              {sheetTitle ? (
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <h3 className="text-base font-semibold app-text">{sheetTitle}</h3>
                  <button
                    type="button"
                    onClick={() => { setIsOpen(false); setSearch(''); }}
                    className="app-icon-button rounded-lg p-2 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Search className="h-4 w-4 shrink-0 app-text-muted" />
                <input
                  ref={searchRef}
                  type="text"
                  className="flex-1 bg-transparent text-sm app-text outline-none placeholder:text-[color:var(--app-text-muted)]"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="rounded-md p-1 app-text-muted transition hover:app-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Options list */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
              {allowClear && value !== '' ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm app-text-muted transition hover:bg-[color:var(--app-surface-muted)]"
                >
                  <span className="italic">{placeholder}</span>
                </button>
              ) : null}
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Search className="mx-auto mb-2 h-8 w-8 app-text-muted opacity-40" />
                  <p className="text-sm app-text-muted">{emptyMessage}</p>
                </div>
              ) : (
                filtered.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition',
                        isSelected
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                          : 'app-text hover:bg-[color:var(--app-surface-muted)]'
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate', isSelected ? 'font-semibold' : 'font-medium')}>
                          {opt.label}
                        </span>
                        {opt.secondary ? (
                          <span className="mt-0.5 block truncate text-xs opacity-60">{opt.secondary}</span>
                        ) : null}
                      </span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label ? (
        <label className="text-[13px] font-semibold tracking-tight app-text-secondary">{label}</label>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={cn(
          'app-select flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-left text-[16px] shadow-sm transition sm:text-sm',
          'focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        {Icon ? (
          <div className="pointer-events-none flex h-5 w-5 shrink-0 items-center justify-center">
            <Icon className="h-5 w-5 app-text-muted" />
          </div>
        ) : null}
        <span className={cn('min-w-0 flex-1 truncate', selectedOption ? 'app-text' : 'app-text-muted')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="pointer-events-none flex shrink-0 items-center justify-center">
          <ChevronDown className="h-4 w-4 app-text-muted" />
        </div>
      </button>
      {helper ? <span className="text-xs app-text-muted">{helper}</span> : null}
      {panel}
      {required && !value ? (
        <input
          type="text"
          required
          value=""
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
};
