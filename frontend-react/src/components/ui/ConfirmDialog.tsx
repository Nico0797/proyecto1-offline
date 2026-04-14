import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'info';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    // Fallback to window.confirm if provider is not available (e.g. in admin routes)
    return (options: ConfirmOptions) => Promise.resolve(window.confirm(options.message));
  }
  return fn;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const handleClose = useCallback(
    (result: boolean) => {
      if (state) {
        state.resolve(result);
        setState(null);
      }
    },
    [state]
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state ? (
        <ConfirmDialogUI
          {...state.options}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
};

// --- Dialog UI ---

interface ConfirmDialogUIProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialogUI: React.FC<ConfirmDialogUIProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const iconNode = {
    destructive: (
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
        <Trash2 className="h-6 w-6 text-red-500" />
      </div>
    ),
    info: (
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
        <Info className="h-6 w-6 text-blue-500" />
      </div>
    ),
    default: (
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
      </div>
    ),
  }[variant];

  const defaultConfirmLabel = variant === 'destructive' ? 'Eliminar' : 'Confirmar';

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6">
      <div
        className="app-overlay-backdrop fixed inset-0 transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="app-surface relative w-full max-w-sm overflow-hidden rounded-t-[28px] shadow-[var(--app-shadow-strong)] sm:rounded-[28px]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="px-6 pt-7 pb-2 text-center sm:px-8 sm:pt-8">
          {iconNode}
          <h3 id="confirm-dialog-title" className="text-lg font-bold app-text">
            {title}
          </h3>
          <p id="confirm-dialog-message" className="mt-2 text-sm leading-relaxed app-text-muted">
            {message}
          </p>
        </div>
        <div className="flex flex-col gap-2 px-6 pb-6 pt-4 sm:flex-row-reverse sm:gap-3 sm:px-8 sm:pb-8">
          <Button
            onClick={onConfirm}
            className={cn(
              'w-full sm:w-auto sm:min-w-[120px]',
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 text-white border-none shadow-sm focus-visible:ring-red-500'
                : ''
            )}
          >
            {confirmLabel || defaultConfirmLabel}
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto sm:min-w-[120px]">
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
