import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { moduleToneClasses, type ModuleTone } from '../../theme/moduleVisualTokens';

type IconContainerProps = {
  icon: LucideIcon;
  tone?: ModuleTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-11 w-11 rounded-2xl',
  lg: 'h-14 w-14 rounded-[1.25rem]',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export const IconContainer = ({
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  className,
}: IconContainerProps) => {
  return (
    <span className={cn('app-icon-container', moduleToneClasses[tone], sizeClasses[size], className)}>
      <Icon className={iconSizeClasses[size]} />
    </span>
  );
};
