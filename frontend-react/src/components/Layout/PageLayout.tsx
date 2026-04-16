import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Ellipsis, Filter, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { useLocation } from 'react-router-dom';
import { useContextualFloatingActionStore } from '../../store/contextualFloatingActionStore';
import { usePageChrome } from './PageChromeContext';

type LayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export const PageLayout: React.FC<LayoutProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn('app-page flex min-h-full w-full flex-col', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const PageStack: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({ children, className, ...props }) => {
  return (
    <div className={cn('app-layout-stack', className)} {...props}>
      {children}
    </div>
  );
};

export const SectionStack: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({ children, className, ...props }) => {
  return (
    <div className={cn('app-section-stack', className)} {...props}>
      {children}
    </div>
  );
};

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  mobileFab?: {
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
  };
  /**
   * REESTRUCTURA: Si true, renderiza el header en el chrome superior fijo (fuera del scroll)
   * en lugar de dentro del contenido scrolleable. Esto mejora la respuesta del scroll en móvil.
   */
  renderInChrome?: boolean;
}> = ({ title, description, action, className, mobileFab, renderInChrome = false }) => {
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);
  const onClickRef = useRef<(() => void) | undefined>(mobileFab?.onClick);
  const registerAction = useContextualFloatingActionStore((state) => state.registerAction);
  const unregisterAction = useContextualFloatingActionStore((state) => state.unregisterAction);
  const ownerKey = `${location.pathname}${location.search}`;
  const hasMobileFab = Boolean(mobileFab);
  const mobileFabLabel = mobileFab?.label;
  const mobileFabIcon = mobileFab?.icon;
  const mobileFabOnClick = mobileFab?.onClick;

  // REESTRUCTURA: Registro en chrome superior si renderInChrome está activado
  const { setHeader } = usePageChrome();

  useEffect(() => {
    onClickRef.current = mobileFabOnClick;
  }, [mobileFabOnClick]);

  useEffect(() => {
    if (renderInChrome) {
      setHeader({ title, description, action });
      return () => setHeader(null);
    }
  }, [renderInChrome, title, description, action, setHeader]);

  useEffect(() => {
    if (!hasMobileFab || !mobileFabLabel) {
      unregisterAction(ownerKey);
      return;
    }

    registerAction({
      ownerKey,
      title,
      label: mobileFabLabel,
      icon: mobileFabIcon,
      onClick: () => onClickRef.current?.(),
    });
  }, [hasMobileFab, mobileFabIcon, mobileFabLabel, ownerKey, registerAction, title, unregisterAction]);

  useEffect(() => {
    if (!hasMobileFab) {
      return undefined;
    }

    return () => unregisterAction(ownerKey);
  }, [hasMobileFab, ownerKey, unregisterAction]);

  // REESTRUCTURA: Si renderInChrome está activado, no renderizamos nada aquí
  // El header se renderizará en el chrome superior fijo via contexto
  if (renderInChrome) {
    return null;
  }

  // Nota: La visibilidad del FAB se controla por scrollTop en MainLayout
  // No usamos IntersectionObserver aquí para mantener consistencia

  return (
    <>
      {/* FAB ANCHOR: Punto donde comienza el contenido real, usado para medir visibilidad del FAB */}
      <div data-mobile-content-start className="shrink-0" />
      <div
        ref={headerRef}
        className={cn(
          'app-page-header app-shell-gutter relative shrink-0 py-1 lg:py-3',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[14px] font-semibold tracking-tight app-text lg:text-lg">{title}</h1>
            {description ? (
              <p className="mt-0.5 line-clamp-1 text-[11px] app-text-muted lg:mt-1 lg:text-sm">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
        </div>
      </div>
    </>
  );
};

export const PageHeaderActionButton: React.FC<React.ComponentProps<typeof Button> & {
  label: string;
  mobileLabel?: string;
  icon?: React.ElementType;
}> = ({ label, mobileLabel, icon: Icon, className, size = 'md', ...props }) => {
  return (
    <Button
      size={size}
      className={cn(
        'app-mobile-header-cta inline-flex w-auto max-w-full shrink-0 items-center justify-center rounded-full px-2.75 py-1.5 text-[12px] font-semibold tracking-tight',
        'min-h-8.5 sm:min-h-9 sm:px-3.5 sm:text-sm lg:px-4.5 lg:py-2',
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-[14px] w-[14px]" /> : null}
      <span className="hidden min-w-0 whitespace-nowrap sm:inline">{label}</span>
      <span className="min-w-0 whitespace-nowrap sm:hidden">{mobileLabel || label}</span>
    </Button>
  );
};

export const PageSection: React.FC<{
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: 'surface' | 'soft' | 'muted';
}> = ({ title, description, action, children, className, contentClassName, tone = 'surface' }) => {
  const toneClassName = useMemo(() => {
    if (tone === 'soft') return 'app-section-card-soft';
    if (tone === 'muted') return 'app-section-card-muted';
    return 'app-section-card';
  }, [tone]);

  return (
    <section className={cn(toneClassName, 'app-mobile-section', className)}>
      {(title || description || action) ? (
        <div className="app-section-header app-mobile-section-header">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-sm font-semibold tracking-tight app-text sm:text-base">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs leading-4.5 app-text-muted sm:text-sm">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn('min-w-0', contentClassName)}>{children}</div>
    </section>
  );
};

export const PageToolbarCard: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, children, className }) => {
  return (
    <section className={cn('app-toolbar-card app-mobile-toolbar-card', className)}>
      {(title || description) ? (
        <div className="app-section-header app-mobile-section-header">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-sm font-semibold tracking-tight app-text sm:text-base">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs leading-4.5 app-text-muted sm:text-sm">{description}</p> : null}
          </div>
        </div>
      ) : null}
      <div className="min-w-0">{children}</div>
    </section>
  );
};

export const ToolbarSection: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, children, className }) => {
  return (
    <PageToolbarCard
      title={title}
      description={description}
      className={cn('app-toolbar-section', className)}
    >
      {children}
    </PageToolbarCard>
  );
};

export const PageSummary: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}> = ({ title = 'Resumen', description, children, className, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const disclosureId = useId();

  return (
    <section className={cn('app-summary-shell app-mobile-summary-shell', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight app-text sm:text-base">{title}</div>
          {description ? <p className="mt-0.5 text-xs leading-4.5 app-text-muted sm:text-sm">{description}</p> : null}
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-2.5 py-1 text-[11px] font-medium app-text-secondary transition hover:border-[color:var(--app-primary-soft-border)] hover:bg-[color:var(--app-primary-soft)] hover:text-[color:var(--app-primary)] sm:px-3 sm:py-1.5 sm:text-xs"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          aria-controls={disclosureId}
        >
          <span>{isExpanded ? 'Ocultar resumen' : 'Ver resumen'}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isExpanded ? 'rotate-180' : '')} />
        </button>
      </div>
      <div id={disclosureId} className={cn('mt-3.5 lg:mt-4', isExpanded ? 'block' : 'hidden')}>
        {children}
      </div>
    </section>
  );
};

export const SummarySection: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}> = ({ title, description, children, className, defaultExpanded }) => {
  return (
    <PageSummary
      title={title}
      description={description}
      className={cn('app-summary-section', className)}
      defaultExpanded={defaultExpanded}
    >
      {children}
    </PageSummary>
  );
};

export const ContentSection: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({ children, className, ...props }) => {
  return (
    <section className={cn('app-content-section', className)} {...props}>
      {children}
    </section>
  );
};

export const PageNotice: React.FC<{
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  dismissible?: boolean;
}> = ({ title, description, action, className, tone = 'info', dismissible = false }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  const toneClassName = tone === 'success'
    ? 'app-banner-success'
    : tone === 'warning'
      ? 'app-banner-warning'
      : tone === 'danger'
        ? 'app-banner-danger'
        : 'app-banner-info';

  return (
    <div className={cn('app-compact-banner', toneClassName, className)}>
      <div className="min-w-0 flex-1">
        {title ? <div className="text-sm font-semibold app-text sm:text-[15px]">{title}</div> : null}
        <p className={cn('text-xs leading-5 sm:text-sm', title ? 'mt-1' : '')}>{description}</p>
      </div>
      <div className="flex shrink-0 items-start gap-2">
        {action ? <div className="hidden sm:flex">{action}</div> : null}
        {dismissible ? (
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => setIsVisible(false)}
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {action ? <div className="sm:hidden">{action}</div> : null}
    </div>
  );
};

export const CompactActionGroup: React.FC<{
  primary?: React.ReactNode;
  secondary?: React.ReactNode | React.ReactNode[];
  collapseLabel?: string;
  className?: string;
}> = ({ primary, secondary, collapseLabel = 'Mas acciones', className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const disclosureId = useId();
  const secondaryChildren = React.Children.toArray(secondary).filter(Boolean);
  const hasSecondary = secondaryChildren.length > 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-1.5 sm:hidden">
        {primary ? <div className="min-w-0 flex-1">{primary}</div> : null}
        {hasSecondary ? (
          <Button
            type="button"
            variant={primary ? 'secondary' : 'outline'}
            size={primary ? 'md' : 'sm'}
            className={cn(
              'shrink-0 rounded-full',
              primary ? 'min-h-8.5 px-2.5 text-[12px]' : 'w-full justify-between rounded-2xl px-3.5'
            )}
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            aria-controls={disclosureId}
          >
            <span className="inline-flex items-center gap-2">
              <Ellipsis className="h-4 w-4" />
              {collapseLabel}
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      {hasSecondary ? (
        <div
          id={disclosureId}
          className={cn(
            'sm:hidden',
            isExpanded ? 'mt-1.5 grid gap-1.5' : 'hidden'
          )}
        >
          {secondaryChildren.map((child, index) => (
            <div key={index} className="min-w-0">
              {child}
            </div>
          ))}
        </div>
      ) : null}

      <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
        {secondaryChildren.map((child, index) => (
          <div key={index} className="min-w-0">
            {child}
          </div>
        ))}
        {primary ? <div className="min-w-0">{primary}</div> : null}
      </div>
    </div>
  );
};

export const PageFilters: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({ children, className, ...props }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn('app-filter-strip shrink-0 z-20 transition-all duration-300', className)} {...props}>
      {/* FASE 1B: Solo mostrar botón de filtros, sin área expandida inline */}
      <div className="app-shell-gutter py-0.5 lg:hidden">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)]/60 px-1.5 py-0.5 text-left text-[10px] font-medium app-text-secondary"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          <Filter className="h-3 w-3" />
          <span>Filtros</span>
          {isExpanded ? <ChevronUp className="h-3 w-3 app-text-muted" /> : <ChevronDown className="h-3 w-3 app-text-muted" />}
        </button>
      </div>

      {/* Área de filtros: solo visible cuando está expandido, o siempre visible en desktop */}
      <div
        className={cn(
          'app-shell-gutter flex flex-col gap-2 transition-all duration-300 ease-in-out lg:flex-row lg:flex-wrap lg:items-center lg:gap-4 xl:gap-5',
          isExpanded ? 'visible max-h-[28rem] overflow-visible py-1.5 opacity-100' : 'invisible max-h-0 overflow-hidden opacity-0 lg:visible lg:max-h-none lg:overflow-visible',
          'lg:h-auto lg:py-2 lg:opacity-100'
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const PageBody: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({ children, className, ...props }) => {
  // NOTA: Eliminado lg:overflow-y-auto para evitar nested scroll.
  // Solo #app-main-scroll en MainLayout debe tener scroll vertical.
  return (
    <div className="relative min-h-0 w-full overflow-x-hidden scroll-smooth" {...props}>
      <div className={cn('app-page-content app-page w-full max-w-full pb-24 lg:pb-10 xl:pb-12', className)}>{children}</div>
    </div>
  );
};

export const DataTableContainer: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({ children, className, ...props }) => {
  return (
    <div className={cn('app-surface flex w-full flex-col overflow-hidden', className)} {...props}>
      <div className="custom-scrollbar flex-1 overflow-auto overscroll-x-contain">
        <div className="inline-block min-w-full align-middle">{children}</div>
      </div>
    </div>
  );
};
