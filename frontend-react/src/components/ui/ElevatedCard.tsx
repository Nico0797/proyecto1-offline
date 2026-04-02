import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { moduleToneClasses, type ModuleTone } from '../../theme/moduleVisualTokens';

type ElevatedCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: ModuleTone;
  interactive?: boolean;
};

export const ElevatedCard = ({
  children,
  tone = 'neutral',
  interactive = false,
  className,
  ...props
}: ElevatedCardProps) => {
  return (
    <div
      className={cn(
        'app-elevated-card',
        moduleToneClasses[tone],
        interactive && 'app-elevated-card-interactive',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
