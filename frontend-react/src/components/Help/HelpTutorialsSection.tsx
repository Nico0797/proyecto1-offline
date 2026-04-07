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
import { useTutorialRuntimeContext } from '../../tour/tutorialContext';
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
    className: 'app-status-chip app-status-chip-success',
  },
  dismissed: {
    label: 'Descartado',
    className: 'app-status-chip app-status-chip-warning',
  },
  in_progress: {
    label: 'En progreso',
    className: 'app-status-chip app-status-chip-info',
  },
  not_started: {
    label: 'Nuevo',
    className: 'app-status-chip app-status-chip-neutral',
  },
};

export const HelpTutorialsSection = ({
  query = '',
  selectedCategoryId = 'all',
}: HelpTutorialsSectionProps) => {
  const { start } = useTour();
  const { user } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const tutorialContext = useTutorialRuntimeContext();
  const perTour = useTourStore((state) => state.perTour);
  const resetTour = useTourStore((state) => state.resetTour);
  const resetAllTours = useTourStore((state) => state.resetAll);
  const syncTourScope = useTourStore((state) => state.syncScope);

  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
  const [pendingResetTourId, setPendingResetTourId] = useState<string | null>(null);

  const onboardingTutorialId = getOnboardingTutorialId(tutorialContext);
  const scopeKey = buildLearningScopeKey(user?.id, activeBusiness?.id);
  const onboardingRecord = perTour[onboardingTutorialId];

  useEffect(() => {
    syncTourScope(scopeKey);
  }, [scopeKey, syncTourScope]);

  const tutorials = useMemo(() => {
    const visible = getVisibleLearningTutorials(tutorialContext);

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
  }, [query, selectedCategoryId, tutorialContext]);

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
        <div className="app-inline-panel-info rounded-[28px] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="app-tone-icon-blue rounded-2xl p-3">
                <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.24em]">
                Primer recorrido
              </div>
              <h3 className="mt-1 text-xl font-semibold app-text">
                {onboardingRecord?.status === 'completed'
                  ? 'Ya conoces el recorrido base de este negocio'
                  : 'Empieza por el recorrido guiado del negocio actual'}
              </h3>
              <p className="mt-2 text-sm leading-6 app-text-secondary">
                {onboardingRecord?.status === 'completed'
                  ? 'Si cambiaste de plan, de modulos o quieres reentrenar a alguien del equipo, puedes volver a abrir el onboarding desde aqui.'
                  : 'La ayuda inicial se adapta al plan y modulos del negocio activo. Te muestra solo lo esencial para empezar bien.'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => start(onboardingTutorialId, { manual: true })}
              className="app-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm transition"
            >
              <Play className="h-4 w-4" />
              {onboardingRecord?.status === 'completed' ? 'Repetir recorrido' : 'Iniciar recorrido'}
            </button>
            <button
              onClick={() => {
                resetTour(onboardingTutorialId);
              }}
              className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition"
            >
              <RefreshCcw className="h-4 w-4" />
              Reiniciar onboarding
            </button>
          </div>
        </div>

        <div className="app-surface rounded-[28px] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="app-inline-panel rounded-2xl p-3 app-text-secondary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] app-text-muted">
                Progreso actual
              </div>
              <div className="mt-1 text-xl font-semibold app-text">
                {tutorials.filter((tutorial) => perTour[tutorial.tourId]?.status === 'completed').length} de {tutorials.length} tutoriales completados
              </div>
              <p className="mt-2 text-sm leading-6 app-text-secondary">
                La ayuda queda disponible despues del onboarding y el progreso se guarda por usuario y negocio.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsResetAllOpen(true)}
            className="app-button-secondary mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition"
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
                <h3 className="text-lg font-semibold app-text">{category.label}</h3>
                <p className="text-sm app-text-muted">{category.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryTutorials.map((tutorial) => {
                  const statusKey = perTour[tutorial.tourId]?.status || 'not_started';
                  const status = STATUS_META[statusKey] || STATUS_META.not_started;

                  return (
                    <article
                      key={tutorial.id}
                      className="app-elevated-card flex h-full flex-col rounded-[26px] p-5 transition hover:border-[color:var(--app-primary-soft-border)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                          </div>
                          <h4 className="mt-3 text-lg font-semibold app-text">{tutorial.title}</h4>
                        </div>
                        <div className="app-inline-panel rounded-2xl px-2.5 py-1 text-xs font-medium">
                          {tutorial.estimatedTime}
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 app-text-secondary">{tutorial.summary}</p>

                      <div className="app-inline-panel mt-4 rounded-2xl p-4 text-sm">
                        <div className="font-medium app-text">Cuando abrirlo</div>
                        <div className="mt-1 leading-6 app-text-secondary">{tutorial.whenToUse}</div>
                      </div>

                      <div className="mt-4 flex-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] app-text-muted">Que te deja claro</div>
                        <div className="mt-2 space-y-2">
                          {tutorial.outcomes.map((outcome) => (
                            <div key={outcome} className="app-inline-panel rounded-2xl px-3 py-2 text-sm">
                              {outcome}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => start(tutorial.tourId, { manual: true })}
                          className="app-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition"
                        >
                          <Play className="h-4 w-4" />
                          {statusKey === 'completed' ? 'Ver otra vez' : 'Abrir tutorial'}
                        </button>
                        <Link
                          to={tutorial.route}
                          className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition"
                        >
                          Abrir modulo
                        </Link>
                        <button
                          onClick={() => setPendingResetTourId(tutorial.tourId)}
                          className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition"
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
        <div className="app-overlay-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="app-surface w-full max-w-md rounded-[28px] p-6 shadow-[var(--app-shadow-strong)]">
            <h3 className="text-lg font-semibold app-text">Reiniciar ayuda y tutoriales</h3>
            <p className="mt-2 text-sm leading-6 app-text-secondary">
              Se borrara el progreso de este negocio y el onboarding volvera a estar disponible.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsResetAllOpen(false)}
                className="app-button-secondary rounded-2xl px-4 py-2.5 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetAll}
                className="border border-[color:var(--app-danger-soft-border)] rounded-2xl bg-[color:var(--app-danger)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_26px_-18px_rgba(220,38,38,0.44)] transition hover:brightness-110"
              >
                Reiniciar todo
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingResetTourId && (
        <div className="app-overlay-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="app-surface w-full max-w-md rounded-[28px] p-6 shadow-[var(--app-shadow-strong)]">
            <h3 className="text-lg font-semibold app-text">Reiniciar este tutorial</h3>
            <p className="mt-2 text-sm leading-6 app-text-secondary">
              Se borrara el progreso guardado para este recorrido y podras empezarlo como nuevo.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setPendingResetTourId(null)}
                className="app-button-secondary rounded-2xl px-4 py-2.5 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetTour(pendingResetTourId);
                  setPendingResetTourId(null);
                }}
                className="border border-[color:var(--app-danger-soft-border)] rounded-2xl bg-[color:var(--app-danger)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_26px_-18px_rgba(220,38,38,0.44)] transition hover:brightness-110"
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
