import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getLearningTutorialById, getOnboardingTutorialId } from '../../help/learningCenter';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { buildLearningScopeKey } from '../../store/learningCenterStore';
import { useTour } from '../../tour/TourProvider';
import { resolveTutorialAvailability } from '../../tour/tutorialEligibility';
import { useTutorialRuntimeContext } from '../../tour/tutorialContext';
import { useTourStore } from '../../tour/tourStore';

const BLOCKED_AUTO_START_PATH_PREFIXES = ['/admin', '/auth'];
const MAX_AUTO_START_RETRIES = 8;

export const LearningCenterOnboarding = () => {
  const { user } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const tutorialContext = useTutorialRuntimeContext();
  const { start } = useTour();
  const location = useLocation();

  const isActive = useTourStore((state) => state.isActive);
  const activeTourId = useTourStore((state) => state.activeTourId);
  const perTour = useTourStore((state) => state.perTour);
  const activeScopeKey = useTourStore((state) => state.scopeKey);
  const syncTourScope = useTourStore((state) => state.syncScope);

  const onboardingTutorialId = useMemo(
    () => getOnboardingTutorialId(tutorialContext),
    [tutorialContext]
  );

  const onboardingDefinition = useMemo(
    () => getLearningTutorialById(onboardingTutorialId),
    [onboardingTutorialId]
  );

  const scopeKey = useMemo(
    () => buildLearningScopeKey(user?.id, activeBusiness?.id),
    [activeBusiness?.id, user?.id]
  );

  const hasAutoStartedRef = useRef(false);
  const retryCountRef = useRef(0);
  const [retryTick, setRetryTick] = useState(0);
  const isAutoStartPathEligible = useMemo(
    () => !BLOCKED_AUTO_START_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix)),
    [location.pathname]
  );

  useEffect(() => {
    syncTourScope(scopeKey);
  }, [scopeKey, syncTourScope]);

  useEffect(() => {
    if (!user || !activeBusiness || !onboardingTutorialId) return;
    if (isActive || activeTourId) return;
    if (activeScopeKey !== scopeKey) return;
    if (!isAutoStartPathEligible) return;
    if (hasAutoStartedRef.current) return;

    const canAutoStart = resolveTutorialAvailability({
      tutorialId: onboardingTutorialId,
      rules: onboardingDefinition?.eligibility || onboardingDefinition?.visibility,
      behavior: onboardingDefinition?.behavior,
      context: tutorialContext,
      trigger: 'auto',
    });

    if (!canAutoStart.eligible) {
      return;
    }

    const timer = window.setTimeout(() => {
      const didStart = start(onboardingTutorialId, { manual: false });
      if (didStart) {
        hasAutoStartedRef.current = true;
        retryCountRef.current = 0;
        return;
      }

      hasAutoStartedRef.current = false;

      if (retryCountRef.current < MAX_AUTO_START_RETRIES) {
        retryCountRef.current += 1;
        window.setTimeout(() => {
          setRetryTick((value) => value + 1);
        }, 450);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    activeBusiness,
    activeTourId,
    activeScopeKey,
    isActive,
    isAutoStartPathEligible,
    onboardingDefinition?.behavior,
    onboardingDefinition?.eligibility,
    onboardingDefinition?.visibility,
    onboardingTutorialId,
    perTour,
    retryTick,
    scopeKey,
    start,
    tutorialContext,
    user,
  ]);

  useEffect(() => {
    hasAutoStartedRef.current = false;
    retryCountRef.current = 0;
    setRetryTick(0);
  }, [scopeKey]);

  return null;
};
