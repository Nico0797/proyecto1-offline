import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Ellipsis, Filter, HelpCircle, LayoutList, Rows3, Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';

export interface MobileViewOption {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon?: React.ElementType;
  badge?: number | string;
  dataTour?: string;
}

export interface MobileSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface MobileInlineTabsProps {
  options: MobileViewOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  compact?: boolean;
}

const useIsDesktopViewport = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isDesktop;
};

const useOverlayDismiss = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
};

export const MobileInlineTabs: React.FC<MobileInlineTabsProps> = ({ options, activeId, onChange, className, compact = false }) => {
  if (options.length <= 1) return null;

  const gridClassName =
    options.length <= 2
      ? 'grid-cols-2'
      : options.length === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : 'grid-cols-2';

  return (
    <div
      className={cn(
        'app-segmented-control grid min-w-0 gap-1',
        compact ? 'p-[3px]' : 'p-1',
        gridClassName,
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.id === activeId;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-current={isActive ? 'page' : undefined}
            data-tour={option.dataTour}
            className={cn(
              'app-segmented-control__item relative flex min-w-0 items-center justify-center gap-1.5 text-center text-xs font-medium transition-all',
              compact ? 'min-h-10 rounded-[14px] px-2.5 py-2' : 'min-h-11 rounded-[16px] px-3 py-2.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]',
              isActive
                ? 'app-segmented-control__item-active text-[color:var(--app-text)]'
                : 'text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text)]',
            )}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
            <span className="min-w-0 whitespace-normal break-words leading-tight">{option.shortLabel || option.label}</span>
            {option.badge ? (
              <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none', isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'bg-red-500 text-white')}>
                {option.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

interface MobileCenteredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  width?: string;
}

export const MobileCenteredModal: React.FC<MobileCenteredModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  bodyClassName,
  width = 'min(420px, calc(100vw - 24px))',
}) => {
  useOverlayDismiss(isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10020] flex items-center justify-center px-3 py-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={cn('app-surface relative flex flex-col overflow-hidden rounded-[26px] shadow-[0_20px_42px_-30px_rgba(15,23,42,0.35)]', className)}
        style={{
          width,
          maxHeight: 'min(78dvh, calc(100dvh - 32px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-centered-modal-title"
      >
        <div className="app-page-header sticky top-0 z-10 flex items-center justify-between border-b app-divider px-4 py-3 backdrop-blur sm:px-5">
          <h3 id="mobile-centered-modal-title" className="pr-3 text-base font-semibold app-text">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="app-icon-button rounded-xl p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cn('custom-scrollbar overflow-y-auto px-4 py-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:px-5', bodyClassName)}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  bodyClassName,
  footer,
}) => {
  useOverlayDismiss(isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10030] flex items-end justify-center px-2 pt-[max(10px,env(safe-area-inset-top))] pb-[max(8px,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={cn('app-surface relative flex w-full flex-col overflow-hidden rounded-[28px] shadow-[0_22px_44px_-32px_rgba(15,23,42,0.38)]', className)}
        style={{
          width: 'min(720px, calc(100vw - 12px))',
          maxHeight: 'min(84dvh, calc(100dvh - 12px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-bottom-sheet-title"
      >
        <div className="flex justify-center pt-2">
          <div className="h-1.5 w-9 rounded-full bg-slate-300/70 dark:bg-slate-600/70" />
        </div>
        <div className="app-page-header sticky top-0 z-10 flex items-center justify-between border-b app-divider px-4 py-3 backdrop-blur sm:px-5">
          <h3 id="mobile-bottom-sheet-title" className="pr-3 text-base font-semibold app-text">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="app-icon-button rounded-xl p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cn('custom-scrollbar min-h-0 overflow-y-auto px-4 py-2.5 sm:px-5', footer ? 'flex-1' : '', bodyClassName)}>
          {children}
        </div>
        {footer ? (
          <div className="border-t app-divider bg-[color:var(--app-surface-elevated)]/95 px-4 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

interface MobileViewSwitcherProps {
  options: MobileViewOption[];
  activeId: string;
  onChange: (id: string) => void;
  label?: string;
  title?: string;
  className?: string;
  buttonClassName?: string;
}

export const MobileViewSwitcher: React.FC<MobileViewSwitcherProps> = ({
  options,
  activeId,
  onChange,
  label = 'Vista',
  title = 'Cambiar vista',
  className,
  buttonClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeOption = useMemo(() => options.find((option) => option.id === activeId) || options[0], [options, activeId]);

  if (!activeOption || options.length <= 1) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'app-button-secondary inline-flex min-w-0 max-w-full items-center gap-2 rounded-full px-3 py-2 text-left text-[13px] transition-all sm:px-3.5 sm:py-2.5 sm:text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]',
          buttonClassName,
        )}
      >
        <LayoutList className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate">
          <span className="text-[color:var(--app-text-secondary)]">{label}: </span>
          <span className="font-medium text-[color:var(--app-text)]">{activeOption.shortLabel || activeOption.label}</span>
        </span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
      </button>

      <MobileCenteredModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        <div className="space-y-2">
          {options.map((option) => {
            const isActive = option.id === activeId;
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                data-tour={option.dataTour}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                  isActive
                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-200'
                    : 'border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]',
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{option.label}</span>
                    {option.description ? <span className="mt-0.5 block text-xs text-[color:var(--app-text-secondary)]">{option.description}</span> : null}
                  </span>
                  {option.badge ? <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{option.badge}</span> : null}
                </span>
                {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </MobileCenteredModal>
    </div>
  );
};

interface MobileUtilityBarProps {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  bare?: boolean;
}

export const MobileUtilityBar: React.FC<MobileUtilityBarProps> = ({ children, className, compact = false, bare = false }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;

  const inlineItems = items.slice(0, 1);
  const overflowItems = items.slice(1);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  return (
    <div className={cn('app-shell-gutter py-0.5 lg:hidden', className)}>
      <div className={cn('app-mobile-utility-bar flex items-center gap-2', compact && 'app-mobile-utility-bar-compact', bare && 'app-mobile-utility-bar-bare', !compact && !bare && 'py-0.5')}>
        {inlineItems.map((child, index) => (
          <div key={index} className="min-w-0 max-w-full flex-1">
            {child}
          </div>
        ))}
        {overflowItems.length ? (
          <>
            <button
              type="button"
              onClick={() => setIsOverflowOpen(true)}
              className="app-button-secondary inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium sm:h-9 sm:px-3 sm:text-sm"
            >
              <Ellipsis className="h-4 w-4 shrink-0" />
              <span>Mas</span>
              {overflowItems.length > 1 ? <span className="text-[11px] text-[color:var(--app-text-secondary)]">{overflowItems.length}</span> : null}
            </button>

            <MobileCenteredModal isOpen={isOverflowOpen} onClose={() => setIsOverflowOpen(false)} title="Mas acciones">
              <div className="space-y-2">
                {overflowItems.map((child, index) => (
                  <div key={index} className="min-w-0 max-w-full">
                    {child}
                  </div>
                ))}
              </div>
            </MobileCenteredModal>
          </>
        ) : null}
      </div>
    </div>
  );
};

interface MobileUtilityActionButtonProps {
  label: string;
  icon?: React.ElementType;
  summary?: string;
  onClick: () => void;
  className?: string;
}

const MobileUtilityActionButton: React.FC<MobileUtilityActionButtonProps> = ({ label, icon: Icon, summary, onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'app-button-secondary inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium sm:h-9 sm:px-3 sm:text-[13px]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]',
      className,
    )}
    title={summary ? `${label}: ${summary}` : label}
  >
    {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
    <span className="min-w-0 truncate sm:max-w-[18ch]">{label}</span>
    {summary ? <span className="hidden max-w-[88px] truncate text-xs text-[color:var(--app-text-secondary)] sm:inline">{summary}</span> : null}
  </button>
);

interface MobileCenteredModalTriggerProps {
  title: string;
  label: string;
  icon?: React.ElementType;
  summary?: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileCenteredModalTrigger: React.FC<MobileCenteredModalTriggerProps> = ({
  title,
  label,
  icon,
  summary,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <MobileUtilityActionButton label={label} icon={icon} summary={summary} onClick={() => setIsOpen(true)} className={className} />
      <MobileCenteredModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        {children}
      </MobileCenteredModal>
    </>
  );
};

interface MobileSheetTriggerProps {
  title: string;
  label: string;
  icon?: React.ElementType;
  summary?: string;
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  footer?: React.ReactNode;
}

const MobileSheetTrigger: React.FC<MobileSheetTriggerProps> = ({
  title,
  label,
  icon: Icon,
  summary,
  children,
  className,
  isOpen: controlledOpen,
  onOpenChange,
  footer,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const resolvedOpen = controlledOpen ?? isOpen;
  const setResolvedOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setIsOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <>
      <MobileUtilityActionButton label={label} icon={Icon} summary={summary} onClick={() => setResolvedOpen(true)} className={className} />
      <MobileBottomSheet isOpen={resolvedOpen} onClose={() => setResolvedOpen(false)} title={title} bodyClassName="space-y-3" footer={footer}>
        {children}
      </MobileBottomSheet>
    </>
  );
};

export const MobileFilterSection: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, children, className }) => (
  <div className={cn('space-y-2.5', className)}>
    {title ? (
      <div className="space-y-1">
        <div className="text-sm font-semibold app-text">{title}</div>
        {description ? <p className="text-xs app-text-muted">{description}</p> : null}
      </div>
    ) : null}
    {children}
  </div>
);

export const MobileFilterActions: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('flex flex-col gap-2 border-t app-divider pt-2.5', className)} {...props}>
    {children}
  </div>
);

interface MobileFilterDrawerProps {
  title?: string;
  label?: string;
  summary?: string;
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onApply: () => void;
  onClear: () => void;
  applyLabel?: string;
  clearLabel?: string;
  applyDisabled?: boolean;
  clearDisabled?: boolean;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  title = 'Filtros y busqueda',
  label = 'Filtros',
  summary,
  children,
  className,
  isOpen,
  onOpenChange,
  onApply,
  onClear,
  applyLabel = 'Aplicar filtros',
  clearLabel = 'Limpiar filtros',
  applyDisabled = false,
  clearDisabled = false,
}) => (
  <MobileSheetTrigger
    title={title}
    label={label}
    icon={Filter}
    summary={summary}
    className={className}
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    footer={(
      <MobileFilterActions className="border-0 p-0 pt-0">
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button onClick={onApply} className="w-full sm:flex-1" disabled={applyDisabled}>
            {applyLabel}
          </Button>
          <Button variant="secondary" onClick={onClear} className="w-full sm:flex-1" disabled={clearDisabled}>
            {clearLabel}
          </Button>
        </div>
      </MobileFilterActions>
    )}
  >
    <div className="space-y-3">{children}</div>
  </MobileSheetTrigger>
);

interface UseMobileFilterDraftOptions<T> {
  value: T;
  onApply: (nextValue: T) => void;
  createEmptyValue: () => T;
  isEqual?: (left: T, right: T) => boolean;
}

export const useMobileFilterDraft = <T,>({
  value,
  onApply,
  createEmptyValue,
  isEqual,
}: UseMobileFilterDraftOptions<T>) => {
  const compare = isEqual ?? ((left: T, right: T) => JSON.stringify(left) === JSON.stringify(right));
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<T>(value);

  useEffect(() => {
    if (!isOpen && !compare(draft, value)) {
      setDraft(value);
    }
  }, [compare, draft, isOpen, value]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (!compare(draft, value)) {
        setDraft(value);
      }
      setIsOpen(true);
      return;
    }
    if (!compare(draft, value)) {
      setDraft(value);
    }
    setIsOpen(false);
  };

  const handleApply = () => {
    onApply(draft);
    setIsOpen(false);
  };

  const handleClear = () => {
    setDraft(createEmptyValue());
  };

  return {
    draft,
    setDraft,
    isOpen,
    isDirty: !compare(draft, value),
    open: () => handleOpenChange(true),
    close: () => handleOpenChange(false),
    apply: handleApply,
    clear: handleClear,
    sheetProps: {
      isOpen,
      onOpenChange: handleOpenChange,
      onApply: handleApply,
      onClear: handleClear,
    },
  };
};

interface MobileSummaryDrawerProps {
  title?: string;
  label?: string;
  summary?: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileSummaryDrawer: React.FC<MobileSummaryDrawerProps> = ({ title = 'Resumen', label = 'Resumen', summary, children, className }) => (
  <MobileCenteredModalTrigger title={title} label={label} icon={Rows3} summary={summary} className={className}>
    <div className="space-y-3.5">{children}</div>
  </MobileCenteredModalTrigger>
);

interface MobileHelpDisclosureProps {
  title?: string;
  label?: string;
  summary?: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileHelpDisclosure: React.FC<MobileHelpDisclosureProps> = ({ title = 'Ayuda rápida', label = 'Ayuda', summary, children, className }) => (
  <MobileCenteredModalTrigger title={title} label={label} icon={HelpCircle} summary={summary} className={className}>
    <div className="space-y-3">{children}</div>
  </MobileCenteredModalTrigger>
);

interface MobileSelectFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: MobileSelectOption[];
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  sheetTitle?: string;
  disabled?: boolean;
}

export const MobileSelectField: React.FC<MobileSelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  className,
  selectClassName,
  sheetTitle,
  disabled = false,
}) => {
  const isDesktop = useIsDesktopViewport();
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  if (isDesktop) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label ? <label className="px-0.5 text-[12px] font-semibold tracking-tight app-text-secondary sm:text-[13px]">{label}</label> : null}
        <select className={cn('app-select w-full', selectClassName)} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          {!selectedOption && placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <>
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label ? <label className="px-0.5 text-[12px] font-semibold tracking-tight app-text-secondary sm:text-[13px]">{label}</label> : null}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className={cn(
            'app-field-surface flex min-h-10 w-full items-center justify-between gap-3 rounded-[18px] px-3.5 py-2.5 text-left text-[15px] transition sm:min-h-11 sm:text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selectClassName,
          )}
        >
          <span className={cn('min-w-0 truncate', selectedOption ? 'text-[color:var(--app-text)]' : 'text-[color:var(--app-text-secondary)]')}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--app-text-secondary)]" />
        </button>
      </div>

      <MobileBottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={sheetTitle || label || placeholder}>
        <div className="space-y-2">
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setIsOpen(false);
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
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{option.label}</span>
                  {option.description ? <span className="mt-0.5 block text-xs text-[color:var(--app-text-secondary)]">{option.description}</span> : null}
                </span>
                {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </MobileBottomSheet>
    </>
  );
};

interface MobileUnifiedPageShellProps {
  utilityBar?: React.ReactNode;
  children: React.ReactNode;
  secondaryContent?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  secondaryClassName?: string;
}

export const MobileUnifiedPageShell: React.FC<MobileUnifiedPageShellProps> = ({
  utilityBar,
  children,
  secondaryContent,
  className,
  contentClassName,
  secondaryClassName,
}) => {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {utilityBar}
      <div className={cn('min-h-0 flex-1 pt-0', contentClassName)}>{children}</div>
      {secondaryContent ? <div className={cn('pt-3 lg:hidden', secondaryClassName)}>{secondaryContent}</div> : null}
    </div>
  );
};

export const MobileSearchHint: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('inline-flex items-center gap-2 rounded-2xl border border-dashed border-[color:var(--app-border)] px-3 py-2 text-xs text-[color:var(--app-text-secondary)]', className)}>
    <Search className="h-3.5 w-3.5" />
    <span>{children}</span>
  </div>
);
