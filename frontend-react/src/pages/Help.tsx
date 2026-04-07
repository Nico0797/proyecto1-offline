import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleHelp, Filter, LifeBuoy, Sparkles } from 'lucide-react';
import { HelpSearch } from '../components/Help/HelpSearch';
import { HelpTutorialsSection } from '../components/Help/HelpTutorialsSection';
import { SupportWhatsAppButton } from '../components/Help/SupportWhatsAppButton';
import {
  getVisibleLearningCategories,
  getVisibleLearningTutorials,
  LEARNING_FAQS,
  LEARNING_GUIDE_CARDS,
  type LearningCategoryId,
} from '../help/learningCenter';
import { useTutorialRuntimeContext } from '../tour/tutorialContext';

const categoryMatchesQuery = (
  query: string,
  title: string,
  body: string
) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${title} ${body}`.toLowerCase().includes(needle);
};

export const Help = () => {
  const tutorialContext = useTutorialRuntimeContext();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LearningCategoryId | 'all'>('all');

  const tutorials = useMemo(
    () => getVisibleLearningTutorials(tutorialContext),
    [tutorialContext]
  );

  const categories = useMemo(
    () => getVisibleLearningCategories(tutorials),
    [tutorials]
  );

  const guideCards = useMemo(() => {
    return LEARNING_GUIDE_CARDS.filter((card) => {
      const matchesCategory = selectedCategory === 'all' || card.categoryId === selectedCategory;
      return matchesCategory && categoryMatchesQuery(query, card.title, card.body);
    });
  }, [query, selectedCategory]);

  const faqs = useMemo(() => {
    return LEARNING_FAQS.filter((faq) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        faq.categoryId === selectedCategory ||
        selectedCategory === 'troubleshooting';
      return matchesCategory && categoryMatchesQuery(query, faq.question, faq.answer);
    });
  }, [query, selectedCategory]);

  return (
    <div className="app-canvas min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="app-elevated-card overflow-hidden rounded-[32px] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="app-status-chip app-status-chip-info inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                <Sparkles className="h-3.5 w-3.5" />
                Centro de aprendizaje
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight app-text sm:text-4xl">
                Ayuda hecha para la app real que usas hoy
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 app-text-muted sm:text-base">
                Aqui encuentras recorridos guiados, ayuda por flujo y respuestas practicas filtradas segun el plan y modulos del negocio activo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="app-inline-panel-info rounded-[24px] p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.22em]">Tutoriales visibles</div>
                <div className="mt-2 text-3xl font-semibold">{tutorials.length}</div>
                <div className="mt-2 text-sm">
                  Solo ves recorridos que si aplican al negocio activo.
                </div>
              </div>
              <div className="app-inline-panel rounded-[24px] p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] app-text-muted">Cobertura</div>
                <div className="mt-2 text-lg font-semibold app-text">Ventas, cobros, facturas, inventario, ajustes y sync</div>
                <div className="mt-2 text-sm app-text-muted">
                  Lo mas importante queda accesible desde esta misma pantalla.
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <HelpSearch onSearch={setQuery} />
          <SupportWhatsAppButton className="w-full justify-center rounded-2xl px-4 py-3 lg:w-auto" />
        </div>

        <section className="app-surface rounded-[28px] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] app-text-muted">Filtrar por enfoque</div>
              <div className="mt-1 text-sm app-text-secondary">
                Cambia de categoria si quieres concentrarte solo en una parte del producto.
              </div>
            </div>
            <div className="app-inline-panel inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
              <Filter className="h-4 w-4" />
              {selectedCategory === 'all'
                ? 'Todas las categorias'
                : categories.find((category) => category.id === selectedCategory)?.label || 'Categoria'}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                selectedCategory === 'all'
                  ? 'app-segmented-option-active text-[color:var(--app-primary)] shadow-sm'
                  : 'app-button-secondary'
              }`}
            >
              Todo
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  selectedCategory === category.id
                    ? 'app-segmented-option-active text-[color:var(--app-primary)] shadow-sm'
                    : 'app-button-secondary'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Link
            to="/dashboard"
            className="app-elevated-card rounded-[28px] p-5 transition hover:border-[color:var(--app-primary-soft-border)]"
          >
            <div className="app-tone-icon-blue inline-flex rounded-2xl p-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold app-text">Volver al inicio</h2>
            <p className="mt-2 text-sm leading-6 app-text-secondary">
              Salta al tablero para aplicar lo que acabas de aprender o revisar si algo cambio hoy.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--app-primary)]">
              Abrir inicio <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            to="/settings?tab=membership"
            className="app-elevated-card rounded-[28px] p-5 transition hover:border-[color:var(--app-primary-soft-border)]"
          >
            <div className="app-icon-container inline-flex rounded-2xl p-3">
              <CircleHelp className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold app-text">Ver tu plan y membresia</h2>
            <p className="mt-2 text-sm leading-6 app-text-secondary">
              Revisa por que algunos modulos o tutoriales cambian segun el plan del negocio actual.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--app-primary)]">
              Abrir membresia <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <button
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            className="app-elevated-card rounded-[28px] p-5 text-left transition hover:border-[color:var(--app-primary-soft-border)]"
          >
            <div className="app-tone-icon-green inline-flex rounded-2xl p-3">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold app-text">Ir a dudas comunes</h2>
            <p className="mt-2 text-sm leading-6 app-text-secondary">
              Si no necesitas un recorrido completo, baja a las respuestas cortas y accionables.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--app-primary)]">
              Ver preguntas utiles <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </section>

        <section id="tutoriales" className="space-y-3">
          <div>
            <h2 className="text-2xl font-semibold app-text">Tutoriales guiados</h2>
            <p className="text-sm app-text-muted">
              Recorridos pensados para tareas reales, no para enumerar pantallas sin contexto.
            </p>
          </div>
          <HelpTutorialsSection query={query} selectedCategoryId={selectedCategory} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="app-surface rounded-[28px] p-5 shadow-sm">
            <h2 className="text-xl font-semibold app-text">Guias cortas</h2>
            <p className="mt-1 text-sm app-text-muted">
              Aclaraciones utiles cuando no necesitas un recorrido completo.
            </p>

            <div className="mt-4 space-y-3">
              {guideCards.length > 0 ? (
                guideCards.map((card) => (
                  <article key={card.id} className="app-inline-panel rounded-[24px] p-4">
                    <h3 className="text-base font-semibold app-text">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 app-text-secondary">{card.body}</p>
                    {card.route ? (
                      <Link to={card.route} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--app-primary)]">
                        Abrir pantalla relacionada <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="app-empty-state rounded-[24px] px-4 py-8 text-sm app-text-muted">
                  No encontramos guias cortas con ese filtro. Prueba otra busqueda o vuelve a ver todas las categorias.
                </div>
              )}
            </div>
          </div>

          <div className="app-surface rounded-[28px] p-5 shadow-sm">
            <h2 className="text-xl font-semibold app-text">Preguntas utiles</h2>
            <p className="mt-1 text-sm app-text-muted">
              Respuestas rapidas para dudas que suelen aparecer despues del onboarding.
            </p>

            <div className="mt-4 space-y-3">
              {faqs.length > 0 ? (
                faqs.map((faq) => (
                  <article key={faq.id} className="app-inline-panel rounded-[24px] p-4">
                    <h3 className="text-base font-semibold app-text">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-6 app-text-secondary">{faq.answer}</p>
                    {faq.relatedTutorialId ? (
                      <div className="mt-3 text-xs font-medium uppercase tracking-[0.22em] app-text-muted">
                        Tutorial relacionado: {tutorials.find((tutorial) => tutorial.id === faq.relatedTutorialId)?.title || 'Disponible en Ayuda'}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="app-empty-state rounded-[24px] px-4 py-8 text-sm app-text-muted">
                  No encontramos preguntas con ese filtro. Puedes limpiar la busqueda o abrir soporte por WhatsApp.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
