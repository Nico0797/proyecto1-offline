import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  icon?: React.ElementType;
  wrapperClassName?: string;
  placeholder?: string;
}

type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const getNodeText = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return getNodeText(node.props.children);
  return '';
};

const useIsDesktopViewport = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
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

export const SelectField: React.FC<SelectFieldProps> = ({
  className,
  wrapperClassName,
  label,
  helper,
  icon: Icon,
  id,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  placeholder,
  ...props
}) => {
  const isDesktop = useIsDesktopViewport();
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  const options = useMemo(() => {
    const parsed: SelectFieldOption[] = [];

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;

      if (child.type === 'option') {
        const optionProps = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
        parsed.push({
          value: String(optionProps.value ?? getNodeText(optionProps.children)),
          label: getNodeText(optionProps.children),
          disabled: optionProps.disabled,
        });
        return;
      }

      if (child.type === 'optgroup') {
        const groupProps = child.props as React.OptgroupHTMLAttributes<HTMLOptGroupElement> & {
          children?: React.ReactNode;
        };
        React.Children.forEach(groupProps.children, (optionChild) => {
          if (!React.isValidElement(optionChild) || optionChild.type !== 'option') return;
          const optionProps = optionChild.props as React.OptionHTMLAttributes<HTMLOptionElement>;
          parsed.push({
            value: String(optionProps.value ?? getNodeText(optionProps.children)),
            label: getNodeText(optionProps.children),
            disabled: groupProps.disabled || optionProps.disabled,
          });
        });
      }
    });

    return parsed;
  }, [children]);

  const currentValue = String(value ?? internalValue ?? '');
  const selectedOption = options.find((option) => option.value === currentValue);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const selectClassName = cn(
    'app-select min-h-11 rounded-2xl px-3.5 py-3 pr-11 text-[16px] shadow-sm transition sm:text-sm',
    'focus:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    Icon ? 'pl-11' : '',
    className,
  );

  const handleMobileChange = (nextValue: string) => {
    setInternalValue(nextValue);
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<HTMLSelectElement>);
    setIsOpen(false);
  };

  const mobilePanel = !isDesktop && isOpen
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6">
          <button
            type="button"
            className="app-overlay-backdrop fixed inset-0"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar selector"
          />
          <div className="app-surface relative flex w-full max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden rounded-t-[28px] shadow-[var(--app-shadow-strong)] sm:max-h-[70vh] sm:max-w-md sm:rounded-[28px]">
            <div className="app-page-header sticky top-0 z-10 flex items-center justify-between border-b app-divider px-5 py-4">
              <h3 className="min-w-0 truncate text-base font-semibold app-text">{label || placeholder || 'Seleccionar'}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="app-icon-button rounded-lg p-2 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
              {options.map((option) => {
                const isActive = option.value === currentValue;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (!option.disabled) handleMobileChange(option.value);
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
      )
    : null;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label ? (
        <label htmlFor={id} className="text-[13px] font-semibold tracking-tight app-text-secondary">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className="h-5 w-5 app-text-muted" />
          </div>
        ) : null}
        {isDesktop ? (
          <select
            id={id}
            className={selectClassName}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            disabled={disabled}
            {...props}
          >
            {children}
          </select>
        ) : (
          <button
            type="button"
            id={id}
            className={cn(selectClassName, 'flex items-center text-left')}
            disabled={disabled}
            onClick={() => setIsOpen(true)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className={cn('min-w-0 flex-1 truncate', selectedOption ? 'app-text' : 'app-text-muted')}>
              {selectedOption?.label || placeholder || 'Seleccionar'}
            </span>
          </button>
        )}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 app-text-muted" />
        </div>
      </div>
      {helper ? <span className="text-xs app-text-muted">{helper}</span> : null}
      {mobilePanel}
    </div>
  );
};
