import { getTourById, type TourStep } from './tourRegistry';
import { tutorialCatalog, type ResolvedTutorialSession, type TutorialCatalogEntry, type TutorialGuard, type TutorialStepRule } from './tutorialCatalog';
import { resolveTutorialAvailability } from './tutorialEligibility';
import type { TutorialRuntimeContext } from './tutorialContext';

const canUseGuard = (guard: TutorialGuard | undefined, context: TutorialRuntimeContext) => {
  return resolveTutorialAvailability({
    rules: guard,
    context,
    trigger: 'catalog',
  }).eligible;
};

const normalizeStep = (
  tutorialId: string,
  step: TourStep,
  context: TutorialRuntimeContext,
  rule?: TutorialStepRule
): TourStep | null => {
  let selector = rule?.selector ?? step.selector;
  let title = step.title;
  let body = step.body;

  if (tutorialId === 'dashboard.expert' && step.id === 'db3') {
    if (context.dashboardVisibleTabs.has('balance')) {
      selector = selector;
    } else if (context.dashboardVisibleTabs.has('analiticas')) {
      selector = '[data-tour="dashboard.tabs.analytics"]';
      title = 'Usa Analisis cuando necesites mas detalle';
      body = [
        'Si no tienes la vista de caja disponible, esta pestaña te ayuda a profundizar en tendencias y comparativos.',
      ];
    } else if (context.dashboardVisibleTabs.has('recordatorios')) {
      selector = '[data-tour="dashboard.tabs.reminders"]';
      title = 'Usa Recordatorios para hacer seguimiento';
      body = [
        'Cuando tu foco es seguimiento y pendientes, esta pestaña concentra lo que requiere accion del equipo.',
      ];
    }
  }

  if (tutorialId === 'settings.expert' && step.id === 'st4') {
    selector = context.hasSettingsSection('membership')
      ? '[data-tour="settings.membership"]'
      : '[data-tour="settings.templates"]';
  }

  const nextStep: TourStep = {
    ...step,
    selector,
    title,
    body,
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

  if (!canUseGuard(definition.visibility, context) || !canUseGuard(definition.eligibility, context)) {
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
