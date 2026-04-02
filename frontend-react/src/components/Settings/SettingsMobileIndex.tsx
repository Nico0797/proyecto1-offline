import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ModuleTone } from '../../theme/moduleVisualTokens';
import { ElevatedCard } from '../ui/ElevatedCard';
import { IconContainer } from '../ui/IconContainer';
import { AppStatusBadge } from '../ui/AppStatusBadge';

export type SettingsMobileEntry = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: ModuleTone;
  badge?: string;
  href?: string;
};

type SettingsMobileIndexProps = {
  sections: SettingsMobileEntry[];
  primarySectionIds: string[];
  onOpenSection: (sectionId: string) => void;
};

const SectionCard = ({
  entry,
  onOpen,
}: {
  entry: SettingsMobileEntry;
  onOpen: (sectionId: string) => void;
}) => {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <IconContainer icon={entry.icon} tone={entry.tone} />
          <div className="min-w-0">
            <div className="text-sm font-semibold app-text">{entry.title}</div>
            <p className="mt-1 text-sm leading-6 app-text-muted">{entry.description}</p>
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 app-text-muted" />
      </div>
      {entry.badge ? (
        <div className="mt-4">
          <AppStatusBadge tone={entry.tone}>{entry.badge}</AppStatusBadge>
        </div>
      ) : null}
    </>
  );

  if (entry.href) {
    return (
      <Link to={entry.href}>
        <ElevatedCard tone={entry.tone} interactive className="p-4">
          {content}
        </ElevatedCard>
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(entry.id)} className="w-full text-left">
      <ElevatedCard tone={entry.tone} interactive className="p-4">
        {content}
      </ElevatedCard>
    </button>
  );
};

export const SettingsMobileIndex = ({
  sections,
  primarySectionIds,
  onOpenSection,
}: SettingsMobileIndexProps) => {
  const primarySections = primarySectionIds
    .map((id) => sections.find((section) => section.id === id))
    .filter((section): section is SettingsMobileEntry => !!section);

  return (
    <div className="space-y-4 pb-4 lg:hidden">
      <ElevatedCard tone="settings" className="p-5">
        <div className="flex items-start gap-3">
          <IconContainer icon={primarySections[0]?.icon || sections[0].icon} tone="settings" size="lg" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] app-text-muted">Configuracion</div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight app-text">Todo el ajuste del negocio, sin tabs rotas</h1>
            <p className="mt-2 text-sm leading-6 app-text-muted">
              En movil cada bloque abre su propia vista para que no se pierda ninguna seccion importante.
            </p>
          </div>
        </div>
      </ElevatedCard>

      <div className="space-y-3">
        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] app-text-muted">Accesos principales</div>
        <div className="grid gap-3">
          {primarySections.map((entry) => (
            <SectionCard key={entry.id} entry={entry} onOpen={onOpenSection} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] app-text-muted">Todas las secciones</div>
        <div className="grid gap-3">
          {sections.map((entry) => (
            <SectionCard key={entry.id} entry={entry} onOpen={onOpenSection} />
          ))}
        </div>
      </div>
    </div>
  );
};
