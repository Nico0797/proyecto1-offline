import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import type { ModuleTone } from '../../theme/moduleVisualTokens';
import { ElevatedCard } from '../ui/ElevatedCard';
import { IconContainer } from '../ui/IconContainer';
import { AppStatusBadge } from '../ui/AppStatusBadge';

type SettingsSectionPageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: ModuleTone;
  badge?: string;
  onBack: () => void;
  children: ReactNode;
};

export const SettingsSectionPage = ({
  title,
  description,
  icon,
  tone,
  badge,
  onBack,
  children,
}: SettingsSectionPageProps) => {
  return (
    <div className="flex min-h-0 flex-col space-y-4 pb-4 lg:hidden">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] px-4 py-2 text-sm font-medium app-text transition hover:bg-[color:var(--app-surface-soft)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a secciones
      </button>

      <ElevatedCard tone={tone} className="p-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
          <IconContainer icon={icon} tone={tone} size="lg" className="shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight app-text">{title}</h1>
              {badge ? <AppStatusBadge tone={tone}>{badge}</AppStatusBadge> : null}
            </div>
            <p className="mt-2 text-sm leading-6 app-text-muted">{description}</p>
          </div>
        </div>
      </ElevatedCard>

      <div className="min-h-0 space-y-4">{children}</div>
    </div>
  );
};
