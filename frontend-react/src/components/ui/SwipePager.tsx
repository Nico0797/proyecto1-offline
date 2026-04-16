import React, { useEffect, useState, ReactNode, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { MobileInlineTabs, MobileViewSwitcher } from '../mobile/MobileContentFirst';

type PageErrorBoundaryProps = {
  pageId: string;
  children: ReactNode;
};

type PageErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

class PageErrorBoundary extends React.Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): PageErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Error de render desconocido',
    };
  }

  componentDidCatch(error: unknown) {
    console.error(`[SwipePager] page render failed (${this.props.pageId})`, error);
  }

  componentDidUpdate(prevProps: PageErrorBoundaryProps) {
    if (prevProps.pageId !== this.props.pageId && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-200">
          <div className="font-semibold">Esta vista falló al renderizar</div>
          <div className="mt-1">Pestaña: {this.props.pageId}</div>
          <div className="mt-1 break-words">Error: {this.state.errorMessage || 'sin detalle'}</div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface Page {
  id: string;
  title: string;
  mobileTitle?: string;
  icon?: React.ElementType;
  content: ReactNode;
  badge?: number | string; // For notifications/counts
  'data-tour'?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface SwipePagerProps {
  pages: Page[];
  activePageId: string;
  onPageChange: (id: string) => void;
  className?: string;
  desktopNavClassName?: string;
  desktopContentClassName?: string;
  mobileBreakpoint?: number; // px, default 768
  contentScroll?: 'auto' | 'visible';
  enableSwipe?: boolean;
  mobileSwitcherLabel?: string;
  mobileSwitcherTitle?: string;
}

interface MobileInternalNavProps {
  pages: Page[];
  activePageId: string;
  onPageChange: (id: string) => void;
  switcherLabel?: string;
  switcherTitle?: string;
}

const getMobileLabel = (page: Page) => page.mobileTitle || page.title;

export const MobileInternalNav: React.FC<MobileInternalNavProps> = ({
  pages,
  activePageId,
  onPageChange,
  switcherLabel = 'Vista',
  switcherTitle = 'Cambiar vista',
}) => {
  const options = useMemo(
    () => pages.map((page) => ({
      id: page.id,
      label: page.title,
      shortLabel: getMobileLabel(page),
      icon: page.icon,
      badge: page.badge,
      dataTour: page['data-tour'],
    })),
    [pages]
  );

  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) || pages[0],
    [pages, activePageId]
  );

  if (!activePage) return null;

  return (
    <div data-swipe-nav className="app-shell-gutter shrink-0 z-20 py-0 lg:py-2">
      {options.length <= 3 ? (
        <MobileInlineTabs options={options} activeId={activePageId} onChange={onPageChange} className="w-full" compact />
      ) : (
        <MobileViewSwitcher
          options={options}
          activeId={activePageId}
          onChange={onPageChange}
          label={switcherLabel}
          title={switcherTitle}
          buttonClassName="w-full justify-between"
        />
      )}
    </div>
  );
};

export const SwipePager: React.FC<SwipePagerProps> = ({
  pages,
  activePageId,
  onPageChange,
  className,
  desktopNavClassName,
  desktopContentClassName,
  mobileBreakpoint = 1024, // Increased to cover tablets/small laptops for better touch experience
  contentScroll = 'auto',
  enableSwipe: _enableSwipe = true,
  mobileSwitcherLabel,
  mobileSwitcherTitle,
}) => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : false);

  // Handle Resize / Breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };
    
    // Check immediately in case of resize/orientation change
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  return (
    <div className={cn("flex min-h-0 w-full flex-col", className)}>
      {isMobile ? (
        <MobileInternalNav
          pages={pages}
          activePageId={activePageId}
          onPageChange={onPageChange}
          switcherLabel={mobileSwitcherLabel}
          switcherTitle={mobileSwitcherTitle}
        />
      ) : (
        <div className={cn("app-page-header shrink-0 z-20 transition-all", desktopNavClassName)}>
          <div className="flex gap-3 px-4 py-2.5 sm:px-6 lg:gap-4 lg:px-8 lg:py-3.5 xl:px-10 xl:py-4">
            {pages.map((page) => {
              const isActive = page.id === activePageId;
              const Icon = page.icon;

              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onPageChange(page.id)}
                  aria-current={isActive ? 'page' : undefined}
                  data-tour={page['data-tour']}
                  className={cn(
                    'relative flex select-none items-center gap-1.5 whitespace-nowrap rounded-none bg-transparent px-1 py-2.5 text-sm transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
                    isActive ? 'app-tab-line-active font-semibold' : 'app-tab-line-idle'
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                  <span>{page.title}</span>
                  {page.badge ? (
                    <span className={cn(
                      'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-red-500 text-white'
                    )}>
                      {page.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="app-canvas relative flex-1 min-h-0">
        {isMobile ? (
          <div className="h-full overflow-visible">
            <div className="app-canvas h-auto w-full overflow-visible px-3.5 py-4 pb-28 sm:px-6 sm:py-6">
              <PageErrorBoundary pageId={activePageId}>
                {pages.find((page) => page.id === activePageId)?.content}
              </PageErrorBoundary>
            </div>
          </div>
        ) : (
          <div className={cn(
            `app-canvas h-full w-full ${contentScroll === 'visible' ? 'overflow-y-visible' : 'overflow-y-auto'} overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8`,
            desktopContentClassName
          )}>
             <PageErrorBoundary pageId={activePageId}>
               {pages.find(p => p.id === activePageId)?.content}
             </PageErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
};
