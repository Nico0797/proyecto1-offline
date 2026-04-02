import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { LearningCenterOnboarding } from '../components/Help/LearningCenterOnboarding';
import { useTourStore } from './tourStore';
import { TourOverlay } from './TourOverlay';
import type { ResolvedTutorialSession } from './tutorialCatalog';
import { resolveTutorialSession } from './tutorialResolver';
import { useTutorialRuntimeContext } from './tutorialContext';
import { useBreakpoint } from './useBreakpoint';

type TourContextType = {
  start: (tourId: string, options?: { manual?: boolean }) => boolean;
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
  const { isActive, startSession: startStoreTour } = useTourStore();
  const [pendingTour, setPendingTour] = useState<{ session: ResolvedTutorialSession; manual?: boolean } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const tutorialContext = useTutorialRuntimeContext();

  const isCurrentRoute = (targetRoute?: string) => {
    if (!targetRoute) return true;
    const currentRoute = `${location.pathname}${location.search}`;
    return currentRoute === targetRoute || location.pathname === targetRoute;
  };

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

  const runTourWhenReady = async (session: ResolvedTutorialSession, options?: { manual?: boolean }) => {
    const tour = session;
    if (!tour) return;

    console.log(`[Tour] Starting tour: ${tour.id}`);

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
    
    startStoreTour(session, options);
  };

  const start = (tourId: string, options?: { manual?: boolean }) => {
    const session = resolveTutorialSession(tourId, tutorialContext);
    if (!session || session.steps.length === 0) {
      console.warn(`[Tour] Tour ${tourId} has no applicable steps for the current context`);
      return false;
    }

    const firstStep = session.steps[0];
    const targetRoute = firstStep?.route;

    // Check if we need to navigate
    if (targetRoute && !isCurrentRoute(targetRoute)) {
      console.log(`[Tour] Navigating to ${targetRoute} for tour ${tourId}`);
      setPendingTour({ session, manual: Boolean(options?.manual) });
      navigate(targetRoute);
      return true;
    } else {
      runTourWhenReady(session, options);
      return true;
    }
  };

  // Effect to handle pending tour on route change
  useEffect(() => {
    if (pendingTour) {
      const tour = pendingTour.session;
      if (tour) {
        const targetRoute = tour.steps[0].route;
        if (isCurrentRoute(targetRoute)) {
            runTourWhenReady(pendingTour.session, { manual: Boolean(pendingTour.manual) });
            setPendingTour(null);
        }
      } else {
          setPendingTour(null);
      }
    }
  }, [isCurrentRoute, location.pathname, location.search, pendingTour]);

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
      <LearningCenterOnboarding />
      {root && isActive && createPortal(<TourOverlay />, root)}
    </TourContext.Provider>
  );
};
