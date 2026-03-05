import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTourStore } from './tourStore';
import { TourStep, getTourById } from './tourRegistry';
import { useVisualViewport } from './useVisualViewport';
import { useTourPositioning } from './useTourPositioning';
import { TourSheetMobile } from './TourSheetMobile';
import { TourOverlayDesktop } from './TourOverlayDesktop';

// Check if element is in viewport (simple check)
function isInViewport(rect: DOMRect) {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export const TourOverlay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTourId, stepIndex, isActive, next, prev, stop, markSkipped } = useTourStore();
  
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);
  const [step, setStep] = useState<TourStep | null>(null);
  const [waitingAction, setWaitingAction] = useState(false);
  const [targetNotFound, setTargetNotFound] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const viewport = useVisualViewport();
  const isMobile = viewport.width < 768;

  // We use getTourById to support the new registry structure
  // For now, if getTourById doesn't exist (because I haven't updated registry yet),
  // I will fallback to `tours[activeTourId]` but `tours` will change type.
  // So I need to update registry ASAP.
  const tour = useMemo(() => (activeTourId ? getTourById(activeTourId) : null), [activeTourId]);

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
    let timeoutId: NodeJS.Timeout | null = null;
    let rafId: number | null = null;
    let clickHandler: (() => void) | null = null;
    
    // Cleanup function
    const cleanup = () => {
      if (mutationObserver) mutationObserver.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      if (observerRef.current) observerRef.current.disconnect();
      
      if (targetRef.current && clickHandler) {
        targetRef.current.removeEventListener('click', clickHandler);
      }
      targetRef.current = null;
    };

    // First, check if we need to navigate
    if (step.route && location.pathname !== step.route) {
      console.log(`[Tour] Need to navigate to ${step.route} for step ${step.id}`);
      navigate(step.route);
      // Wait for navigation to complete before trying to find target
      return;
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
      if (!isInViewport(r)) {
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
      const waitSelector = step.waitFor || step.selector;
      if (!waitSelector) {
          setRect(null);
          setTargetNotFound(false);
          return;
      }

      // 1. Fast path: Check immediately
      let el = step.selector ? document.querySelector(step.selector) as HTMLElement : null;
      if (step.waitFor && !document.querySelector(step.waitFor)) el = null; // If wait condition not met, ignore target

      if (el) {
        onTargetFound(el);
        return;
      }

      // 2. Observer path: Use MutationObserver efficiently
      // We only observe if not found immediately
      const observerConfig = { childList: true, subtree: true, attributes: false }; // Reduced scope if possible, but usually need subtree
      
      mutationObserver = new MutationObserver((mutations) => {
        // Debounce or check efficiently? 
        // For now, just check again. Browser is fast enough for querySelector.
        let found = step.selector ? document.querySelector(step.selector) as HTMLElement : null;
        if (step.waitFor && !document.querySelector(step.waitFor)) found = null;

        if (found) {
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
         let found = step.selector ? document.querySelector(step.selector) as HTMLElement : null;
         if (step.waitFor && !document.querySelector(step.waitFor)) found = null;
         
         if (found) {
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
        
        if (step.optional) {
          next();
        } else {
          setRect(null);
          setTargetNotFound(true);
          setWaitingAction(false);
        }
      }, timeoutMs);
    };

    waitForTarget();

    return cleanup;
  }, [step, isActive, location.pathname, next]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') markSkipped(activeTourId || '');
      if (e.key === 'ArrowRight' && !waitingAction) next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, waitingAction, activeTourId, next, prev, markSkipped]);

  if (!isActive || !tour || !step) return null;

  const position = useTourPositioning(rect, popoverRect, step.placement || 'auto', viewport);
  const total = tour.steps.length;

  return (
    <div className="fixed inset-0 z-[2147483647] pointer-events-none text-left" aria-live="polite">
      {/* MASK LAYERS - The "Hole" approach */}
      {rect && !targetNotFound && (
        <>
          {/* Top */}
          <div className="absolute bg-black/60 transition-all duration-300 ease-out pointer-events-auto" 
               style={{ top: 0, left: 0, right: 0, height: rect.top }} />
          {/* Bottom */}
          <div className="absolute bg-black/60 transition-all duration-300 ease-out pointer-events-auto" 
               style={{ top: rect.bottom, left: 0, right: 0, bottom: 0 }} />
          {/* Left */}
          <div className="absolute bg-black/60 transition-all duration-300 ease-out pointer-events-auto" 
               style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
          {/* Right */}
          <div className="absolute bg-black/60 transition-all duration-300 ease-out pointer-events-auto" 
               style={{ top: rect.top, left: rect.right, right: 0, height: rect.height }} />
          
          {/* Highlight Border (The "Spotlight") */}
          <div 
            className="absolute border-2 border-cyan-400 rounded-lg shadow-[0_0_0_4px_rgba(34,211,238,0.2)] transition-all duration-300 ease-out pointer-events-none z-[2147483649]"
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
          {!step.allowInteraction && (
            <div className="absolute pointer-events-auto"
                 style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
            />
          )}
        </>
      )}

      {/* Full screen backdrop if no rect (fallback) */}
      {(!rect || targetNotFound) && <div className="absolute inset-0 bg-black/60 pointer-events-auto" />}

      {/* Render Mobile Sheet or Desktop Popover */}
      {isMobile ? (
        <TourSheetMobile 
          step={step}
          stepIndex={stepIndex}
          totalSteps={total}
          onNext={next}
          onPrev={prev}
          onSkip={() => markSkipped(activeTourId || '')}
          onStop={stop}
          waitingAction={waitingAction}
          isFallback={targetNotFound}
        />
      ) : (
        <TourOverlayDesktop 
          ref={popoverRef}
          step={step}
          stepIndex={stepIndex}
          totalSteps={total}
          onNext={next}
          onPrev={prev}
          onSkip={() => markSkipped(activeTourId || '')}
          onStop={stop}
          waitingAction={waitingAction}
          position={position}
          isFallback={targetNotFound}
        />
      )}
    </div>
  );
};
