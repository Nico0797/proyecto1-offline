import React, { useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Ellipsis, Filter, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';

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
}> = ({ title, description, action, className }) => {
  return (
    <div className={cn('app-page-header app-shell-gutter shrink-0 z-20 flex flex-col gap-2 py-2 pt-safe sm:gap-3 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:py-4 xl:py-5', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold tracking-tight app-text sm:text-lg lg:text-[1.4rem] xl:text-[1.55rem]">{title}</h1>
        {description ? (
          <p className="mt-0.5 line-clamp-1 max-w-3xl text-[11px] app-text-muted sm:line-clamp-2 sm:text-sm lg:mt-1 lg:max-w-4xl lg:text-[0.95rem]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-2 lg:ml-8 lg:w-auto lg:justify-end lg:gap-3">{action}</div> : null}
    </div>
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
    <section className={cn(toneClassName, className)}>
      {(title || description || action) ? (
        <div className="app-section-header">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-sm font-semibold tracking-tight app-text sm:text-base">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs leading-5 app-text-muted sm:text-sm">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
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
    <PageSection
      tone="surface"
      title={title}
      description={description}
      className={cn('app-toolbar-card', className)}
      contentClassName="min-w-0"
    >
      {children}
    </PageSection>
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
    <section className={cn('app-summary-shell', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight app-text sm:text-base">{title}</div>
          {description ? <p className="mt-1 text-xs leading-5 app-text-muted sm:text-sm">{description}</p> : null}
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-1.5 text-xs font-medium app-text-secondary transition hover:border-[color:var(--app-primary-soft-border)] hover:bg-[color:var(--app-primary-soft)] hover:text-[color:var(--app-primary)]"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          aria-controls={disclosureId}
        >
          <span>{isExpanded ? 'Ocultar resumen' : 'Ver resumen'}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isExpanded ? 'rotate-180' : '')} />
        </button>
      </div>
      <div id={disclosureId} className={cn('mt-4 lg:mt-5', isExpanded ? 'block' : 'hidden')}>
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
      <div className="flex items-center gap-2 sm:hidden">
        {primary ? <div className="min-w-0 flex-1">{primary}</div> : null}
        {hasSecondary ? (
          <Button
            type="button"
            variant={primary ? 'secondary' : 'outline'}
            size={primary ? 'md' : 'sm'}
            className={cn(
              'shrink-0',
              primary ? 'px-3.5' : 'w-full justify-between rounded-2xl px-3.5'
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
            isExpanded ? 'mt-2 grid gap-2' : 'hidden'
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
    <div className={cn('app-page-header shrink-0 z-20 transition-all duration-300', className)} {...props}>
      <div
        className="app-shell-gutter flex cursor-pointer items-center justify-between py-2 hover:bg-[color:var(--app-surface-soft)] lg:hidden"
        onClick={() => setIsExpanded((current) => !current)}
      >
        <div className="flex items-center gap-2 text-xs font-medium app-text-secondary sm:text-sm">
          <Filter className="h-4 w-4" />
          <span>Filtros y busqueda</span>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 app-text-muted" /> : <ChevronDown className="h-4 w-4 app-text-muted" />}
      </div>

      <div
        className={cn(
          'app-shell-gutter flex flex-col gap-3 transition-all duration-300 ease-in-out lg:flex-row lg:flex-wrap lg:items-center lg:gap-5 xl:gap-6',
          isExpanded ? 'visible max-h-[28rem] overflow-visible py-2 opacity-100' : 'invisible max-h-0 overflow-hidden opacity-0 lg:visible lg:max-h-none lg:overflow-visible',
          'lg:h-auto lg:py-4 lg:opacity-100'
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const PageBody: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({ children, className, ...props }) => {
  return (
    <div className="custom-scrollbar relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth" {...props}>
      <div className={cn('app-page-content app-page w-full max-w-full pb-28 lg:pb-10 xl:pb-12', className)}>{children}</div>
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
