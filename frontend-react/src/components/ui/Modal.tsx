import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = 'max-w-lg',
  ...rest
}) => {
  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6">
      <div 
        className="app-overlay-backdrop fixed inset-0 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className={cn(
          "app-surface relative flex max-h-[calc(100dvh-0.5rem)] w-full flex-col overflow-hidden rounded-t-[28px] shadow-[var(--app-shadow-strong)] transition-all sm:max-h-[90vh] sm:rounded-[28px]",
          maxWidth,
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        {...rest}
      >
        <div className="app-page-header sticky top-0 z-10 flex items-center justify-between border-b app-divider px-4 py-3.5 backdrop-blur sm:px-6 sm:py-4">
          <h3 
            id="modal-title"
            className="pr-4 text-base font-semibold app-text sm:text-lg"
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="app-icon-button rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]"
            aria-label="Close modal"
            data-tour="modal.close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="custom-scrollbar overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
