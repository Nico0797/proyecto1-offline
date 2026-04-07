import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTourStore } from './tourStore';
import { TourStep } from './tourRegistry';
import { useVisualViewport } from './useVisualViewport';
import { useTourPositioning } from './useTourPositioning';
import { TourSheetMobile } from './TourSheetMobile';
import { TourOverlayDesktop } from './TourOverlayDesktop';
import { useBreakpoint } from './useBreakpoint';

// Check if element is in viewport (simple check)
function isInViewport(rect: DOMRect, bottomOffset = 0) {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= ((window.innerHeight || document.documentElement.clientHeight) - bottomOffset) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Helper to find scrollable parent
const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
  if (!node) return null;
  
  const isScrollable = (el: HTMLElement) => {
    const hasScrollableContent = el.scrollHeight > el.clientHeight;
    const overflowY = window.getComputedStyle(el).overflowY;
    const isOverflowScroll = overflowY.includes('auto') || overflowY.includes('scroll');
    return hasScrollableContent && isOverflowScroll;
  };

  if (isScrollable(node)) {
    return node;
  }
  
  return getScrollParent(node.parentElement);
};

export const TourOverlay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSession, stepIndex, isActive, next, prev, stop, dismissActiveTour, completeActiveTour } = useTourStore();
  
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);
  const [step, setStep] = useState<TourStep | null>(null);
  const [waitingAction, setWaitingAction] = useState(false);
  const [targetNotFound, setTargetNotFound] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const viewport = useVisualViewport();
  const { isMobile } = useBreakpoint();

  const isCurrentRoute = (targetRoute?: string) => {
    if (!targetRoute) return true;
    const currentRoute = `${location.pathname}${location.search}`;
    return currentRoute === targetRoute || location.pathname === targetRoute;
  };

  // We use getTourById to support the new registry structure
  const tour = useMemo(() => activeSession, [activeSession]);

  // Resolve current step properties based on breakpoint
  const resolvedStep: TourStep | null = useMemo(() => {
     if (!step) return null;
     
     const s = step;
     const selector = s.targets 
        ? (isMobile ? s.targets.mobile?.selector || s.targets.desktop?.selector : s.targets.desktop?.selector || s.targets.mobile?.selector)
        : s.selector;

     const placement = s.targets
        ? (isMobile ? s.targets.mobile?.placement || s.targets.desktop?.placement : s.targets.desktop?.placement || s.targets.mobile?.placement)
        : s.placement;

     const title = s.targets
        ? (isMobile ? s.targets.mobile?.title || s.targets.desktop?.title : s.targets.desktop?.title || s.targets.mobile?.title) || s.title
        : s.title;

     const body = s.targets
        ? (isMobile ? s.targets.mobile?.body || s.targets.desktop?.body : s.targets.desktop?.body || s.targets.mobile?.body) || s.body
        : s.body;

     return {
        ...s,
        selector,
        placement,
        title,
        body
     } as TourStep;
  }, [step, isMobile]);

  // Sync step
  useEffect(() => {
    if (!isActive || !tour) {
      setRect(null);
      setStep(null);
      setTargetNotFound(false);
      return;
    }
    const s = tour.steps[stepIndex];
    console.log(`[Tour] Step changed to: ${s?.id}, index: ${stepIndex}, total: ${tour.steps.length}`);
    if (s) {
      setStep(s);
      setTargetNotFound(false); // Reset on step change
    }
    else stop(); // End if no step
  }, [isActive, tour, stepIndex, stop]);

  // Measure popover size
  useEffect(() => {
    if (popoverRef.current) {
      setPopoverRect(popoverRef.current.getBoundingClientRect());
    }
  }, [step, isMobile, targetNotFound]); // Re-measure when content changes or mode changes

  // Find and track target
  useEffect(() => {
    if (!step || !isActive) return;

    let mutationObserver: MutationObserver | null = null;
    let timeoutId: any = null;
    let rafId: number | null = null;
    let clickHandler: (() => void) | null = null;
    
    // Resolve selector based on breakpoint
    const resolvedSelector = resolvedStep?.selector;

    // Cleanup function
    const cleanup = () => {
      if (mutationObserver) mutationObserver.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      if (observerRef.current) observerRef.current.disconnect();
      
      if (targetRef.current) {
        if (clickHandler) targetRef.current.removeEventListener('click', clickHandler);
        
        // Restore padding if we added it
        const scrollParent = getScrollParent(targetRef.current);
        if (scrollParent && scrollParent.dataset.tourPadding) {
             scrollParent.style.paddingBottom = scrollParent.dataset.originalPadding || '';
             delete scrollParent.dataset.tourPadding;
             delete scrollParent.dataset.originalPadding;
        }
      }
      targetRef.current = null;
    };

    // First, check if we need to navigate
    if (step.route && !isCurrentRoute(step.route)) {
      console.log(`[Tour] Need to navigate to ${step.route} for step ${step.id}`);
      try {
        navigate(step.route);
        // Wait for navigation to complete before trying to find target
        // Add a small delay to ensure route change propagates
        setTimeout(() => {
          console.log(`[Tour] Navigation complete, now searching for target for step ${step.id}`);
          waitForTarget();
        }, 100);
        return;
      } catch (error) {
        console.error(`[Tour] Failed to navigate to ${step.route} for step ${step.id}:`, error);
        if (step.optional) {
          console.log(`[Tour] Step ${step.id} is optional, skipping due to navigation failure`);
          next();
        } else {
          setRect(null);
          setTargetNotFound(true);
          setWaitingAction(false);
        }
        return;
      }
    }
    
    const onTargetFound = (el: HTMLElement) => {
      targetRef.current = el;
      setTargetNotFound(false);
      
      // Setup ResizeObserver for size changes
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new ResizeObserver(() => {
        setRect(el.getBoundingClientRect());
      });
      observerRef.current.observe(el);
      
      // Setup RAF for position changes (e.g. scroll, layout shifts)
      // Use requestAnimationFrame loop but throttle updates
      let lastTime = 0;
      const updateRect = (time: number) => {
        if (!targetRef.current || !isActive) {
           if (rafId) cancelAnimationFrame(rafId);
           return;
        }

        // Throttle to ~30fps (33ms) to reduce CPU load
        if (time - lastTime < 33) {
           rafId = requestAnimationFrame(updateRect);
           return;
        }
        lastTime = time;

        const newRect = targetRef.current.getBoundingClientRect();
        setRect(prev => {
           if (!prev) return newRect;
           // Intentionally loose equality check to avoid jitter
           if (Math.abs(prev.top - newRect.top) < 1 && 
               Math.abs(prev.left - newRect.left) < 1 && 
               Math.abs(prev.width - newRect.width) < 1 && 
               Math.abs(prev.height - newRect.height) < 1) {
             rafId = requestAnimationFrame(updateRect);
             return prev;
           }
           rafId = requestAnimationFrame(updateRect);
           return newRect;
        });
      };
      rafId = requestAnimationFrame(updateRect);
      
      // Scroll if needed
      const r = el.getBoundingClientRect();
      const sheetHeight = isMobile ? 300 : 0;
      
      if (!isInViewport(r, sheetHeight)) {
         if (isMobile) {
             const scrollParent = getScrollParent(el);
             if (scrollParent && !scrollParent.dataset.tourPadding) {
                 scrollParent.dataset.tourPadding = 'true';
                 scrollParent.dataset.originalPadding = scrollParent.style.paddingBottom;
                 scrollParent.style.paddingBottom = '370px';
             }
         }
         el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }

      // Handle interaction
      setWaitingAction(!!step.allowInteraction);
      if (step.allowInteraction) {
         const onInteract = () => {
           // Small delay to allow action to complete (e.g., navigation)
           setTimeout(() => {
             setWaitingAction(false);
             next();
           }, 300);
         };
         clickHandler = onInteract;
         el.addEventListener('click', onInteract, { once: true });
      }
    };

    // Optimized waitForTarget
    const waitForTarget = () => {
      const waitSelector = step.waitFor || resolvedSelector;
      if (!waitSelector) {
          console.warn(`[Tour] Step ${step.id} has no selector or waitFor condition`);
          setRect(null);
          setTargetNotFound(false);
          return;
      }

      // 1. Fast path: Check immediately
      let el = resolvedSelector ? document.querySelector(resolvedSelector) as HTMLElement : null;
      if (step.waitFor && !document.querySelector(step.waitFor)) el = null; // If wait condition not met, ignore target

      if (el) {
        console.log(`[Tour] Found target for step ${step.id}:`, el);
        onTargetFound(el);
        return;
      }

      // 2. Observer path: Use MutationObserver efficiently
      // We only observe if not found immediately
      const observerConfig = { childList: true, subtree: true, attributes: false }; // Reduced scope if possible, but usually need subtree
      
      console.log(`[Tour] Starting observer for step ${step.id} with selector: ${resolvedSelector}`);
      
      mutationObserver = new MutationObserver((_mutations) => {
        // Debounce or check efficiently? 
        // For now, just check again. Browser is fast enough for querySelector.
        let found = resolvedSelector ? document.querySelector(resolvedSelector) as HTMLElement : null;
        if (step.waitFor && !document.querySelector(step.waitFor)) found = null;

        if (found) {
          console.log(`[Tour] Observer found target for step ${step.id}:`, found);
          if (mutationObserver) mutationObserver.disconnect();
          if (timeoutId) clearTimeout(timeoutId);
          onTargetFound(found);
        }
      });

      // Target the specific container if possible, otherwise body
      // If we know the route, we might target #root or a specific layout div
      const root = document.getElementById('root') || document.body;
      mutationObserver.observe(root, observerConfig);

      // 3. Fallback polling (rarely needed if Observer works, but good for computed styles/visibility)
      const intervalId = setInterval(() => {
         let found = resolvedSelector ? document.querySelector(resolvedSelector) as HTMLElement : null;
         if (step.waitFor && !document.querySelector(step.waitFor)) found = null;
         
         if (found) {
            console.log(`[Tour] Polling found target for step ${step.id}:`, found);
            clearInterval(intervalId);
            if (mutationObserver) mutationObserver.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
            onTargetFound(found);
         }
      }, 500); // Check every 500ms just in case

      // 4. Timeout
      const timeoutMs = step.waitFor ? 10000 : 4000; // Reduced default timeout to 4s
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (mutationObserver) mutationObserver.disconnect();
        
        console.warn(`[Tour] Timeout waiting for target ${resolvedSelector} on step ${step.id}`);
        
        if (step.optional) {
          console.log(`[Tour] Step ${step.id} is optional, skipping to next step`);
          next();
        } else {
          console.error(`[Tour] Required step ${step.id} failed to find target: ${resolvedSelector}`);
          setRect(null);
          setTargetNotFound(true);
          setWaitingAction(false);
        }
      }, timeoutMs);
    };

    waitForTarget();

    return cleanup;
  }, [step, isActive, location.pathname, next, isMobile]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') dismissActiveTour();
      if (e.key === 'ArrowRight' && !waitingAction) next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissActiveTour, isActive, next, prev, waitingAction]);

  if (!isActive || !tour || !step || !resolvedStep) return null;

  const position = useTourPositioning(rect, popoverRect, resolvedStep.placement || 'auto', viewport);
  const total = tour.steps.length;

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none text-left" aria-live="polite">
      {/* MASK LAYERS - The "Hole" approach */}
      {rect && !targetNotFound && (
        <>
          {/* Top */}
          <div className="absolute bg-black/60 transition-all duration-300 ease-out pointer-events-auto z-[10]" 
               style={{ top: 0, left: 0, right: 0, height: rect.top }} />
          {/* Bottom */}
          <div className="absolute bg-black/60 transition-all duration-300 ease-out pointer-events-auto z-[10]" 
               style={{ top: rect.bottom, left: 0, right: 0, bottom: 0 }} />
          {/* Left */}
          <div className="absolute bg-black/60 transition-all duration-300 ease-out pointer-events-auto z-[10]" 
               style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
          {/* Right */}
          <div className="absolute bg-black/60 transition-all duration-300 ease-out pointer-events-auto z-[10]" 
               style={{ top: rect.top, left: rect.right, right: 0, height: rect.height }} />
          
          {/* Highlight Border (The "Spotlight") */}
          <div 
            className="absolute border-2 border-cyan-400 rounded-lg shadow-[0_0_0_4px_rgba(34,211,238,0.2)] transition-all duration-300 ease-out pointer-events-none z-[20]"
            style={{ 
              top: rect.top - (isMobile ? 8 : 4), // Larger padding on mobile
              left: rect.left - (isMobile ? 8 : 4), 
              width: rect.width + (isMobile ? 16 : 8), 
              height: rect.height + (isMobile ? 16 : 8),
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)' 
            }}
          >
             {/* Pulse Animation Ring */}
             <div className="absolute inset-0 rounded-lg border-2 border-cyan-400/50 animate-ping" />
          </div>
          
          {/* Allow interaction zone if enabled */}
          {!resolvedStep.allowInteraction && (
            <div className="absolute pointer-events-auto z-[25]"
                 style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
            />
          )}
        </>
      )}

      {/* Full screen backdrop if no rect (fallback) */}
      {(!rect || targetNotFound) && <div className="absolute inset-0 bg-black/60 pointer-events-auto z-[10]" />}

      {/* Render Mobile Sheet or Desktop Popover */}
      {isMobile ? (
        <TourSheetMobile 
          step={resolvedStep}
          stepIndex={stepIndex}
          totalSteps={total}
          onNext={next}
          onPrev={prev}
          onSkip={dismissActiveTour}
          onStop={completeActiveTour}
          waitingAction={waitingAction}
          isFallback={targetNotFound}
        />
      ) : (
        <TourOverlayDesktop 
          ref={popoverRef}
          step={resolvedStep}
          stepIndex={stepIndex}
          totalSteps={total}
          onNext={next}
          onPrev={prev}
          onSkip={dismissActiveTour}
          onStop={completeActiveTour}
          waitingAction={waitingAction}
          position={position}
          isFallback={targetNotFound}
        />
      )}
    </div>
  );
};
