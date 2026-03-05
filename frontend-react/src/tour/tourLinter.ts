
import { tourModules, Tour, TourStep } from './tourRegistry';

export type TourLintResult = {
  tourId: string;
  route: string;
  stepId: string;
  selectorKey: string;
  required: boolean;
  found: boolean;
  status: 'FOUND' | 'MISSING' | 'WRONG_ROUTE' | 'OPTIONAL_MISSING' | 'WAIT_FOR';
};

/**
 * Linter for tour targets.
 * Runs in both DEV and PROD for diagnosis.
 * Checks if targets exist in the current route.
 */
export const lintTours = (): TourLintResult[] => {
  // In production, we might want to skip this or only run on demand
  // For now, let's keep it restricted to DEV or if explicitly requested
  if (!import.meta.env.DEV && !(window as any).ENABLE_TOUR_LINT) return [];

  const results: TourLintResult[] = [];
  const currentPath = window.location.pathname;

  console.group('🔍 Tour Linter Diagnosis');
  console.log(`Current Route: ${currentPath}`);

  // List ALL data-tour attributes on the page
  const allTourElements = document.querySelectorAll('[data-tour]');
  console.log(`Found ${allTourElements.length} elements with data-tour attribute:`);
  allTourElements.forEach(el => {
    console.log(`  - ${el.getAttribute('data-tour')}`);
  });

  Object.values(tourModules).forEach((module) => {
    // Check Tour
    checkTour(module.tour, module.route || '', currentPath, results);
  });

  // Group by status for better visibility
  const missing = results.filter(r => r.status === 'MISSING');
  const found = results.filter(r => r.status === 'FOUND');
  const wrongRoute = results.filter(r => r.status === 'WRONG_ROUTE');
  const optionalMissing = results.filter(r => r.status === 'OPTIONAL_MISSING');
  const waitFor = results.filter(r => r.status === 'WAIT_FOR');

  if (missing.length > 0) {
    console.error(`❌ Found ${missing.length} missing required targets on current route!`);
    console.table(missing.map(({ tourId, stepId, selectorKey }) => ({ tourId, stepId, selectorKey })));
  } else {
    console.log('✅ No missing required targets on current route.');
  }
  
  if (waitFor.length > 0) {
    console.info(`⏳ Found ${waitFor.length} targets waiting for interaction (modal/tab).`);
    console.table(waitFor.map(({ tourId, stepId, selectorKey }) => ({ tourId, stepId, selectorKey })));
  }

  if (optionalMissing.length > 0) {
    console.warn(`⚠️ Found ${optionalMissing.length} missing optional targets.`);
    console.table(optionalMissing.map(({ tourId, stepId, selectorKey }) => ({ tourId, stepId, selectorKey })));
  }

  console.log(`ℹ️ Verified ${found.length} targets.`);
  console.log(`ℹ️ Skipped ${wrongRoute.length} targets due to route mismatch.`);

  console.groupEnd();
  return results;
};

const checkTour = (tour: Tour, moduleRoute: string, currentPath: string, results: TourLintResult[]) => {
  tour.steps.forEach((step: TourStep) => {
    if (!step.selector) return;

    const targetRoute = step.route || moduleRoute;
    const isCurrentRoute = targetRoute === currentPath;

    let found = false;
    let status: TourLintResult['status'] = 'WRONG_ROUTE';

    if (isCurrentRoute) {
      const element = document.querySelector(step.selector);
      found = !!element;
      if (found) {
        status = 'FOUND';
      } else if (step.waitFor) {
        // If it has waitFor, we assume it's valid to be missing initially
        status = 'WAIT_FOR';
      } else {
        status = step.optional ? 'OPTIONAL_MISSING' : 'MISSING';
      }
    }

    // Only log significant issues or if verbose mode is desired (can add flag later)
    if (status === 'MISSING') {
       console.warn(`[Lint] ❌ Missing target: ${step.selector} in tour ${tour.id} (step ${step.id})`);
    }

    results.push({
      tourId: tour.id,
      route: targetRoute,
      stepId: step.id,
      selectorKey: step.selector,
      required: !step.optional,
      found,
      status
    });
  });
};

// Expose to window for manual run
(window as any).lintTours = lintTours;
