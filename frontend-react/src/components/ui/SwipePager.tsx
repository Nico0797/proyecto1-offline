import React, { useEffect, useState, useCallback, ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '../../utils/cn';

interface Page {
  id: string;
  title: string;
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
  mobileBreakpoint?: number; // px, default 768
  contentScroll?: 'auto' | 'visible';
}

export const SwipePager: React.FC<SwipePagerProps> = ({
  pages,
  activePageId,
  onPageChange,
  className,
  mobileBreakpoint = 1024, // Increased to cover tablets/small laptops for better touch experience
  contentScroll = 'auto',
}) => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : false);

  // We only enable drag on mobile.
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    watchDrag: isMobile,
    duration: 25 // Fast snap
  });

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

  // Sync Embla with activePageId (only if mobile/embla active)
  useEffect(() => {
    if (!emblaApi || !isMobile) return;
    
    const index = pages.findIndex(p => p.id === activePageId);
    if (index !== -1 && index !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(index);
    }
  }, [activePageId, emblaApi, pages, isMobile]);

  // Listen to Embla select event to update activePageId
  const onSelect = useCallback(() => {
    if (!emblaApi || !isMobile) return;
    const index = emblaApi.selectedScrollSnap();
    const page = pages[index];
    if (page && page.id !== activePageId) {
      onPageChange(page.id);
    }
  }, [emblaApi, pages, activePageId, onPageChange, isMobile]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Re-init embla when mobile state changes
  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [isMobile, emblaApi]);

  return (
    <div className={cn("flex flex-col h-full w-full overflow-hidden", className)}>
      {/* Tabs Header */}
      <div className="shrink-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 transition-all">
         <div className="flex overflow-x-auto no-scrollbar px-3 md:px-4 py-2.5 gap-2 md:gap-4 touch-pan-x after:content-[''] after:block after:w-12 after:shrink-0">
            {pages.map((page) => {
              const isActive = page.id === activePageId;
              const Icon = page.icon;
              const variant = page.variant || 'default';
              
              const activeStyles = {
                default: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20",
                success: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400 border border-green-200/70 dark:border-green-500/20",
                warning: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400 border border-yellow-200/70 dark:border-yellow-500/20",
                danger: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400 border border-red-200/70 dark:border-red-500/20",
                info: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border border-cyan-200/70 dark:border-cyan-500/20",
              };

              return (
                <button
                  key={page.id}
                  onClick={() => onPageChange(page.id)}
                  data-tour={page['data-tour']}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap select-none relative shrink-0",
                    // Mobile: Segmented/Pill style
                    isMobile && isActive 
                      ? `${activeStyles[variant]} shadow-sm` 
                      : isMobile 
                        ? "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/70 bg-white dark:bg-gray-800"
                        : "",
                    // Desktop: Tab style
                    !isMobile && isActive 
                      ? "bg-transparent border-b-2 border-blue-600 rounded-none px-1 py-3 text-sm text-blue-600 dark:text-blue-400" 
                      : !isMobile
                        ? "bg-transparent border-b-2 border-transparent hover:bg-transparent px-1 py-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        : ""
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="truncate max-w-[10rem] md:max-w-none">{page.title}</span>
                  {page.badge && (
                     <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                       {page.badge}
                     </span>
                  )}
                </button>
              );
            })}
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-50 dark:bg-gray-900">
        {isMobile ? (
          /* Mobile: Embla Carousel */
          <div className="h-full" ref={emblaRef}>
            <div className="flex h-full touch-pan-y"> 
              {pages.map((page) => (
                <div 
                  key={page.id} 
                  className="flex-[0_0_100%] min-w-0 h-full relative"
                >
                  {/* Internal Scroll Container */}
                  <div className={`h-full w-full ${contentScroll === 'visible' ? 'overflow-y-visible' : 'overflow-y-auto'} overflow-x-hidden p-4 pb-24`}>
                      {page.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Desktop: Standard Render (only active page) */
          <div className={`h-full w-full ${contentScroll === 'visible' ? 'overflow-y-visible' : 'overflow-y-auto'} overflow-x-hidden p-6`}>
             {pages.find(p => p.id === activePageId)?.content}
          </div>
        )}
      </div>
    </div>
  );
};
