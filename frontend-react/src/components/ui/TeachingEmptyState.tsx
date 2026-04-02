import type { FC } from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface TeachingEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  nextStep?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
}

export const TeachingEmptyState: FC<TeachingEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  nextStep,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  compact = false,
}) => {
  return (
    <div className={cn(
      'app-soft-surface border-dashed border-gray-300 p-6 text-center shadow-sm dark:border-gray-700',
      compact ? 'px-4 py-5 sm:px-5 sm:py-6' : 'px-6 py-8 sm:py-10',
      className
    )}>
      <div className={cn(
        "mx-auto flex items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300",
        compact ? "h-12 w-12" : "h-14 w-14"
      )}>
        <Icon className={cn(compact ? "h-6 w-6" : "h-7 w-7")} />
      </div>

      <h3 className={cn("font-semibold text-gray-900 dark:text-white", compact ? "mt-3 text-base" : "mt-4 text-lg")}>{title}</h3>
      <p className={cn("mx-auto max-w-2xl text-sm text-gray-500 dark:text-gray-400", compact ? "mt-1.5" : "mt-2")}>{description}</p>

      {nextStep && (
        <div className={cn(
          "mx-auto max-w-2xl rounded-xl border border-blue-100 bg-blue-50/70 text-sm text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300",
          compact ? "mt-3 px-3 py-2.5" : "mt-4 px-4 py-3"
        )}>
          <span className="font-medium">Primer paso:</span> {nextStep}
        </div>
      )}

      {(primaryActionLabel || secondaryActionLabel) && (
        <div className={cn("flex flex-wrap items-center justify-center gap-3", compact ? "mt-4" : "mt-5")}>
          {primaryActionLabel && onPrimaryAction && (
            <Button onClick={onPrimaryAction}>
              {primaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
