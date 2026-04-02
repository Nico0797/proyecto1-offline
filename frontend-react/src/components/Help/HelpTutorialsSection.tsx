import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, RefreshCcw, RotateCcw, Sparkles } from 'lucide-react';
import {
  getOnboardingTutorialId,
  getVisibleLearningCategories,
  getVisibleLearningTutorials,
  LEARNING_CATEGORIES,
  type LearningCategoryId,
} from '../../help/learningCenter';
import { useAccess } from '../../hooks/useAccess';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { buildLearningScopeKey } from '../../store/learningCenterStore';
import { useTour } from '../../tour/TourProvider';
import { useTourStore } from '../../tour/tourStore';

type HelpTutorialsSectionProps = {
  query?: string;
  selectedCategoryId?: LearningCategoryId | 'all';
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  completed: {
    label: 'Completado',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-300',
  },
  dismissed: {
    label: 'Descartado',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300',
  },
  in_progress: {
    label: 'En progreso',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300',
  },
  not_started: {
    label: 'Nuevo',
    className: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300',
  },
};

export const HelpTutorialsSection = ({
  query = '',
  selectedCategoryId = 'all',
}: HelpTutorialsSectionProps) => {
  const { start } = useTour();
  const { user } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const { canAccess, hasPermission, subscriptionPlan } = useAccess();
  const perTour = useTourStore((state) => state.perTour);
  const resetTour = useTourStore((state) => state.resetTour);
  const resetAllTours = useTourStore((state) => state.resetAll);
  const syncTourScope = useTourStore((state) => state.syncScope);

  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
  const [pendingResetTourId, setPendingResetTourId] = useState<string | null>(null);

  const onboardingTutorialId = getOnboardingTutorialId(subscriptionPlan, activeBusiness);
  const scopeKey = buildLearningScopeKey(user?.id, activeBusiness?.id);
  const onboardingRecord = perTour[onboardingTutorialId];

  useEffect(() => {
    syncTourScope(scopeKey);
  }, [scopeKey, syncTourScope]);

  const tutorials = useMemo(() => {
    const visible = getVisibleLearningTutorials({
      plan: subscriptionPlan,
      business: activeBusiness,
      canAccessFeature: canAccess,
      hasPermission,
    });

    const needle = query.trim().toLowerCase();
    return visible.filter((tutorial) => {
      const matchesCategory = selectedCategoryId === 'all' || tutorial.categoryId === selectedCategoryId;
      if (!matchesCategory) return false;
      if (!needle) return true;

      return [
        tutorial.title,
        tutorial.summary,
        tutorial.whenToUse,
        ...tutorial.outcomes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [activeBusiness, canAccess, hasPermission, query, selectedCategoryId, subscriptionPlan]);

  const visibleCategories = useMemo(() => {
    const filteredCategories = getVisibleLearningCategories(tutorials);
    return LEARNING_CATEGORIES.filter((category) => filteredCategories.some((item) => item.id === category.id));
  }, [tutorials]);

  const handleResetAll = () => {
    resetAllTours();
    setIsResetAllOpen(false);
  };

  const grouped = visibleCategories.map((category) => ({
    category,
    tutorials: tutorials.filter((tutorial) => tutorial.categoryId === category.id),
  }));

  return (
    <div className="space-y-5" data-tour="help.section">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm dark:border-blue-900/30 dark:from-blue-900/10 dark:via-gray-900 dark:to-cyan-900/10">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
                <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">
                Primer recorrido
              </div>
              <h3 className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
                {onboardingRecord?.status === 'completed'
                  ? 'Ya conoces el recorrido base de este negocio'
                  : 'Empieza por el recorrido guiado del negocio actual'}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {onboardingRecord?.status === 'completed'
                  ? 'Si cambiaste de plan, de modulos o quieres reentrenar a alguien del equipo, puedes volver a abrir el onboarding desde aqui.'
                  : 'La ayuda inicial se adapta al plan y modulos del negocio activo. Te muestra solo lo esencial para empezar bien.'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => start(onboardingTutorialId, { manual: true })}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <Play className="h-4 w-4" />
              {onboardingRecord?.status === 'completed' ? 'Repetir recorrido' : 'Iniciar recorrido'}
            </button>
            <button
              onClick={() => {
                resetTour(onboardingTutorialId);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <RefreshCcw className="h-4 w-4" />
              Reiniciar onboarding
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-gray-100 p-3 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                Progreso actual
              </div>
              <div className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
                {tutorials.filter((tutorial) => perTour[tutorial.tourId]?.status === 'completed').length} de {tutorials.length} tutoriales completados
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                La ayuda queda disponible despues del onboarding y el progreso se guarda por usuario y negocio.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsResetAllOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar todos los tutoriales
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {grouped.map(({ category, tutorials: categoryTutorials }) => {
          if (!categoryTutorials.length) return null;

          return (
            <section key={category.id} className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{category.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryTutorials.map((tutorial) => {
                  const statusKey = perTour[tutorial.tourId]?.status || 'not_started';
                  const status = STATUS_META[statusKey] || STATUS_META.not_started;

                  return (
                    <article
                      key={tutorial.id}
                      className="flex h-full flex-col rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                          </div>
                          <h4 className="mt-3 text-lg font-semibold text-gray-950 dark:text-white">{tutorial.title}</h4>
                        </div>
                        <div className="rounded-2xl bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {tutorial.estimatedTime}
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{tutorial.summary}</p>

                      <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm dark:bg-gray-800/70">
                        <div className="font-medium text-gray-900 dark:text-white">Cuando abrirlo</div>
                        <div className="mt-1 leading-6 text-gray-600 dark:text-gray-300">{tutorial.whenToUse}</div>
                      </div>

                      <div className="mt-4 flex-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Que te deja claro</div>
                        <div className="mt-2 space-y-2">
                          {tutorial.outcomes.map((outcome) => (
                            <div key={outcome} className="rounded-2xl border border-gray-100 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
                              {outcome}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => start(tutorial.tourId, { manual: true })}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          <Play className="h-4 w-4" />
                          {statusKey === 'completed' ? 'Ver otra vez' : 'Abrir tutorial'}
                        </button>
                        <Link
                          to={tutorial.route}
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                          Abrir modulo
                        </Link>
                        <button
                          onClick={() => setPendingResetTourId(tutorial.tourId)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Reiniciar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {isResetAllOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-950 dark:text-white">Reiniciar ayuda y tutoriales</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Se borrara el progreso de este negocio y el onboarding volvera a estar disponible.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsResetAllOpen(false)}
                className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetAll}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Reiniciar todo
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingResetTourId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-950 dark:text-white">Reiniciar este tutorial</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Se borrara el progreso guardado para este recorrido y podras empezarlo como nuevo.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setPendingResetTourId(null)}
                className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetTour(pendingResetTourId);
                  setPendingResetTourId(null);
                }}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
