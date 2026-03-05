import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTourStore } from './tourStore';
import { TourOverlay } from './TourOverlay';
import { tours } from './tourRegistry';
import { useBreakpoint } from './useBreakpoint';

type TourContextType = {
  start: (tourId: string) => void;
};

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

export const TourProvider = ({ children }: { children?: ReactNode }) => {
  const { isActive, start: startStoreTour } = useTourStore();
  const [pendingTourId, setPendingTourId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  // Helper: waitForSelector
  const waitForSelector = (selector: string, timeout = 4000): Promise<Element | null> => {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Fallback polling with rAF
      const startTime = Date.now();
      const check = () => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
          return;
        }
        if (Date.now() - startTime > timeout) {
          observer.disconnect();
          resolve(null);
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    });
  };

  const runTourWhenReady = async (tourId: string) => {
    const tour = tours[tourId];
    if (!tour) return;

    console.log(`[Tour] Starting tour: ${tourId}`);

    // Always start the tour. The Overlay will handle missing steps.
    // We only wait for the first step if it has a selector, just to be nice,
    // but we don't block start if it fails.
    const firstStep = tour.steps[0];
    let selector = firstStep?.selector;

    // Resolve selector based on breakpoint
    if (firstStep?.targets) {
      if (isMobile) {
        selector = firstStep.targets.mobile?.selector || firstStep.targets.desktop?.selector;
      } else {
        selector = firstStep.targets.desktop?.selector || firstStep.targets.mobile?.selector;
      }
    }

    if (selector) {
      // Try to wait, but ignore result
      await waitForSelector(selector, 2000); 
    }
    
    startStoreTour(tourId);
  };

  const start = (tourId: string) => {
    const tour = tours[tourId];
    if (!tour) {
      console.warn(`[Tour] Tour ${tourId} not found`);
      return;
    }

    const firstStep = tour.steps[0];
    const targetRoute = firstStep?.route;

    // Check if we need to navigate
    if (targetRoute && location.pathname !== targetRoute) {
      console.log(`[Tour] Navigating to ${targetRoute} for tour ${tourId}`);
      setPendingTourId(tourId);
      navigate(targetRoute);
    } else {
      // Already on route or no route required
      runTourWhenReady(tourId);
    }
  };

  // Effect to handle pending tour on route change
  useEffect(() => {
    if (pendingTourId) {
      const tour = tours[pendingTourId];
      if (tour) {
        // Check if we are on the correct route
        // We use startsWith to handle sub-routes if necessary, but exact match is safer for now
        // Or if the tour step route matches current location
        const targetRoute = tour.steps[0].route;
        if (targetRoute && location.pathname === targetRoute) {
            runTourWhenReady(pendingTourId);
            setPendingTourId(null);
        }
      } else {
          setPendingTourId(null);
      }
    }
  }, [location.pathname, pendingTourId]);

  // Ensure tour root exists
  useEffect(() => {
    const el = document.getElementById('tour-root');
    if (!el) {
      const root = document.createElement('div');
      root.id = 'tour-root';
      document.body.appendChild(root);
    }
  }, []);

  const root = typeof document !== 'undefined' ? document.getElementById('tour-root') : null;

  return (
    <TourContext.Provider value={{ start }}>
      {children}
      {root && isActive && createPortal(<TourOverlay />, root)}
    </TourContext.Provider>
  );
};
