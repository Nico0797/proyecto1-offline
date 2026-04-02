import { isPlanAtLeast } from '../auth/plan';
import { getTourById, type TourStep } from './tourRegistry';
import { tutorialCatalog, type ResolvedTutorialSession, type TutorialCatalogEntry, type TutorialGuard, type TutorialStepRule } from './tutorialCatalog';
import type { TutorialRuntimeContext } from './tutorialContext';

const canUseGuard = (guard: TutorialGuard | undefined, context: TutorialRuntimeContext) => {
  if (!guard) return true;
  if (guard.minimumPlan && !isPlanAtLeast(context.plan, guard.minimumPlan)) return false;
  if (guard.moduleKey && !context.hasModule(guard.moduleKey)) return false;
  if (guard.permission && !context.hasPermission(guard.permission)) return false;
  if (guard.visibleRoute && !context.hasRoute(guard.visibleRoute)) return false;
  if (guard.settingsSection && !context.hasSettingsSection(guard.settingsSection)) return false;
  if (guard.feature && !context.canAccessFeature(guard.feature)) return false;
  if (guard.capability && !context.hasCapability(guard.capability)) return false;
  if (guard.commercialSection && !context.hasCommercialSection(guard.commercialSection)) return false;
  return true;
};

const normalizeStep = (
  tutorialId: string,
  step: TourStep,
  context: TutorialRuntimeContext,
  rule?: TutorialStepRule
): TourStep | null => {
  let selector = rule?.selector ?? step.selector;

  if (tutorialId === 'dashboard.expert' && step.id === 'db3') {
    selector = context.dashboardVisibleTabs.has('balance')
      ? selector
      : context.dashboardVisibleTabs.has('analiticas')
        ? '[data-tour="dashboard.tabs.analytics"]'
        : '[data-tour="dashboard.tabs.hoy"]';
  }

  if (tutorialId === 'settings.expert' && step.id === 'st4') {
    selector = context.hasSettingsSection('membership')
      ? '[data-tour="settings.membership"]'
      : '[data-tour="settings.templates"]';
  }

  const nextStep: TourStep = {
    ...step,
    selector,
    optional: rule?.optional ?? step.optional,
  };

  return nextStep;
};

const resolveFromRegistry = (
  definition: Extract<TutorialCatalogEntry, { baseTourId: string }>,
  context: TutorialRuntimeContext
): ResolvedTutorialSession | null => {
  const baseTour = getTourById(definition.baseTourId);
  if (!baseTour) return null;

  const steps = baseTour.steps
    .filter((step) => {
      const rule = definition.stepRules?.[step.id];
      if (!canUseGuard(rule, context)) return false;
      if (step.route && !context.hasRoute(step.route)) return false;
      return true;
    })
    .map((step) => normalizeStep(definition.id, step, context, definition.stepRules?.[step.id]))
    .filter((step): step is TourStep => !!step);

  if (!steps.length) return null;

  return {
    id: definition.id,
    title: definition.title,
    experience: definition.experience,
    steps,
  };
};

export const resolveTutorialSession = (
  tutorialId: string,
  context: TutorialRuntimeContext
): ResolvedTutorialSession | null => {
  const definition = tutorialCatalog[tutorialId];
  if (!definition) {
    const baseTour = getTourById(tutorialId);
    if (!baseTour) return null;
    return {
      id: tutorialId,
      title: baseTour.title,
      experience: 'deep',
      steps: baseTour.steps.filter((step) => !step.route || context.hasRoute(step.route)),
    };
  }

  if (!canUseGuard(definition.visibility, context)) {
    return null;
  }

  if ('buildSteps' in definition) {
    const steps = definition.buildSteps(context).filter((step) => !step.route || context.hasRoute(step.route));
    if (!steps.length) return null;
    return {
      id: definition.id,
      title: definition.title,
      experience: definition.experience,
      steps,
    };
  }

  return resolveFromRegistry(definition, context);
};
