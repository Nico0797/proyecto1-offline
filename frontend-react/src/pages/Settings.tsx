import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell,
  Building2,
  HelpCircle,
  History,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { FEATURES } from '../auth/plan';
import { BusinessAuditTab } from '../components/Settings/BusinessAuditTab';
import { BusinessPersonalizationSimple } from '../components/Settings/BusinessPersonalizationSimple';
import { BusinessSettingsTab } from '../components/Settings/BusinessSettingsTab';
import { NotificationSettingsTab } from '../components/Settings/NotificationSettingsTab';
import { ProfileSettingsTab } from '../components/Settings/ProfileSettingsTab';
import { RolesPermissionsTab } from '../components/Settings/RolesPermissionsTab';
import { SettingsMobileIndex, type SettingsMobileEntry } from '../components/Settings/SettingsMobileIndex';
import { SettingsSectionPage } from '../components/Settings/SettingsSectionPage';
import TeamSettingsTab from '../components/Settings/TeamSettingsTab';
import { TemplatesSettingsTab } from '../components/Settings/TemplatesSettingsTab';
import { ProGate } from '../components/ui/ProGate';
import { ElevatedCard } from '../components/ui/ElevatedCard';
import { IconContainer } from '../components/ui/IconContainer';
import { AppStatusBadge } from '../components/ui/AppStatusBadge';
import { useAccess } from '../hooks/useAccess';
import { isOfflineProductMode } from '../runtime/runtimeMode';

type SettingsSectionId =
  | 'profile'
  | 'business'
  | 'personalization'
  | 'audit'
  | 'team'
  | 'roles'
  | 'notifications'
  | 'templates';

type SettingsSectionDefinition = SettingsMobileEntry & {
  id: SettingsSectionId;
};

const createSection = (section: SettingsSectionDefinition) => section;

const MOBILE_PRIMARY_SECTIONS: SettingsSectionId[] = ['business', 'personalization', 'notifications', 'templates'];

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
};

export const Settings = () => {
  const offlineProductMode = isOfflineProductMode();
  const {
    canManageBusinessExperience,
    canViewAudit,
    canViewTeamWorkspace,
    canManageRoles,
  } = useAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useIsDesktop();

  const sections = useMemo<SettingsSectionDefinition[]>(() => {
    const nextSections: SettingsSectionDefinition[] = [
      createSection({
        id: 'profile',
        title: 'Perfil y cuenta',
        description: 'Datos de acceso y preferencias personales.',
        icon: User,
        tone: 'settings',
      }),
      createSection({
        id: 'business',
        title: 'Negocio',
        description: 'Identidad, moneda y datos del negocio activo.',
        icon: Building2,
        tone: 'settings',
      }),
      ...(canManageBusinessExperience
        ? [createSection({
            id: 'personalization',
            title: 'Personalizacion y modulos',
            description: 'Menu, modulos y experiencia del negocio.',
            icon: Sparkles,
            tone: 'products',
          })]
        : []),
      ...(!offlineProductMode && canViewTeamWorkspace
        ? [createSection({
            id: 'team',
            title: 'Equipo',
            description: 'Miembros, invitaciones y roles del equipo.',
            icon: Users,
            tone: 'sales',
          })]
        : []),
      ...(!offlineProductMode && canManageRoles
        ? [createSection({
            id: 'roles',
            title: 'Roles y permisos',
            description: 'Controla accesos y acciones sensibles.',
            icon: ShieldCheck,
            tone: 'alerts',
            badge: 'Acceso',
          })]
        : []),
      createSection({
        id: 'notifications',
        title: 'Notificaciones',
        description: 'Avisos y alertas para este usuario.',
        icon: Bell,
        tone: 'alerts',
      }),
      createSection({
        id: 'templates',
        title: 'Plantillas e integraciones',
        description: 'Plantillas comerciales e integraciones clave.',
        icon: LayoutTemplate,
        tone: 'products',
      }),
      ...(canViewAudit
        ? [createSection({
            id: 'audit',
            title: 'Historial',
            description: 'Cambios y trazabilidad del negocio.',
            icon: History,
            tone: 'neutral',
          })]
        : []),
    ];

    const deduped = new Map<SettingsSectionId, SettingsSectionDefinition>();
    nextSections.forEach((section) => deduped.set(section.id, section));

    return Array.from(deduped.values());
  }, [canManageBusinessExperience, canManageRoles, canViewAudit, canViewTeamWorkspace, offlineProductMode]);

  const mobileSections = useMemo<SettingsMobileEntry[]>(
    () => [
      ...sections,
      {
        id: 'help',
        title: 'Ayuda',
        description: 'Tutoriales, soporte y guias practicas.',
        icon: HelpCircle,
        tone: 'neutral',
        href: '/help',
      },
    ],
    [sections],
  );

  const setSectionParam = (nextSection?: SettingsSectionId) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextSection) {
      nextParams.set('section', nextSection);
      nextParams.set('tab', nextSection);
    } else {
      nextParams.delete('section');
      nextParams.delete('tab');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const requestedSection = searchParams.get('section') ?? searchParams.get('tab') ?? '';
  const normalizedRequestedSection = requestedSection === 'modules' ? 'personalization' : requestedSection;
  const activeSection = sections.find((section) => section.id === normalizedRequestedSection);
  const desktopDefaultSection = sections[0]?.id ?? 'profile';

  useEffect(() => {
    if (requestedSection === 'modules') {
      setSectionParam('personalization');
      return;
    }

    if (normalizedRequestedSection && activeSection) {
      return;
    }

    if (isDesktop) {
      setSectionParam(desktopDefaultSection);
    }
  }, [activeSection, desktopDefaultSection, isDesktop, requestedSection]);

  const renderSectionContent = (sectionId?: SettingsSectionId) => {
    switch (sectionId) {
      case 'profile':
        return <ProfileSettingsTab />;
      case 'business':
        return <BusinessSettingsTab />;
      case 'personalization':
        return <BusinessPersonalizationSimple />;
      case 'audit':
        return offlineProductMode ? <BusinessAuditTab /> : (
          <ProGate feature={FEATURES.AUDIT_TRAIL} mode="block">
            <BusinessAuditTab />
          </ProGate>
        );
      case 'team':
        return <TeamSettingsTab />;
      case 'roles':
        return offlineProductMode ? null : (
          <ProGate feature={FEATURES.TEAM_MANAGEMENT} mode="block">
            <RolesPermissionsTab />
          </ProGate>
        );
      case 'notifications':
        return <NotificationSettingsTab />;
      case 'templates':
        return offlineProductMode ? <TemplatesSettingsTab /> : (
          <ProGate feature={FEATURES.WHATSAPP_TEMPLATES} mode="block">
            <TemplatesSettingsTab />
          </ProGate>
        );
      default:
        return null;
    }
  };

  if (!isDesktop) {
    return (
      <div className="app-canvas app-shell-gutter app-mobile-bottom-offset flex min-h-full flex-col gap-4 pt-3.5">
        {activeSection ? (
          <SettingsSectionPage
            title={activeSection.title}
            description={activeSection.description}
            icon={activeSection.icon}
            tone={activeSection.tone}
            badge={activeSection.badge}
            onBack={() => setSectionParam(undefined)}
          >
            {renderSectionContent(activeSection.id)}
          </SettingsSectionPage>
        ) : (
          <SettingsMobileIndex
            sections={mobileSections}
            primarySectionIds={MOBILE_PRIMARY_SECTIONS}
            onOpenSection={(sectionId) => setSectionParam(sectionId as SettingsSectionId)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-canvas app-shell-gutter flex h-full min-h-0 flex-col gap-4 py-3.5 lg:flex-row lg:gap-6 lg:py-6" data-tour="settings.panel">
      <aside className="flex w-full flex-shrink-0 flex-col lg:sticky lg:top-6 lg:h-[calc(100dvh-120px)] lg:w-80 lg:justify-between">
        <ElevatedCard tone="settings" className="space-y-4 p-4 sm:p-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] app-text-muted">Configuracion</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight app-text sm:text-3xl">Ajustes del negocio</h1>
            <p className="mt-2 text-sm leading-6 app-text-muted">
              Cuenta, negocio y experiencia de uso en un solo lugar.
            </p>
          </div>

          <nav className="space-y-2">
            {sections.map((section) => {
              const isActive = activeSection?.id === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSectionParam(section.id)}
                  data-tour={`settings.${section.id}`}
                  className={`w-full rounded-[1.35rem] text-left transition-all ${
                    isActive ? 'app-tab-active shadow-sm' : 'app-tab-idle'
                  }`}
                >
                  <div className="flex items-start gap-4 px-4 py-3.5">
                    <IconContainer icon={section.icon} tone={section.tone} size="md" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold app-text">{section.title}</div>
                        {section.badge ? <AppStatusBadge tone={section.tone}>{section.badge}</AppStatusBadge> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 app-text-muted">{section.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </ElevatedCard>

        <div className="mt-4">
          <ElevatedCard tone="neutral" className="p-4">
            <div className="flex items-start gap-4">
              <IconContainer icon={HelpCircle} tone="neutral" size="md" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold app-text">Ayuda y aprendizaje</div>
                <p className="mt-1 text-xs leading-5 app-text-muted">
                  Tutoriales, soporte y material guiado siguen disponibles desde Ayuda.
                </p>
              </div>
            </div>
          </ElevatedCard>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-24 lg:pb-6">
        <div className="mx-auto max-w-6xl">{renderSectionContent(activeSection?.id || desktopDefaultSection)}</div>
      </main>
    </div>
  );
};
