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
import { useAccess } from '../hooks/useAccess';
import { useBusinessStore } from '../store/businessStore';

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
  const { activeBusiness } = useBusinessStore();
  const { canAccess, hasPermission, subscriptionPlan } = useAccess();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LearningCategoryId | 'all'>('all');

  const tutorials = useMemo(
    () =>
      getVisibleLearningTutorials({
        plan: subscriptionPlan,
        business: activeBusiness,
        canAccessFeature: canAccess,
        hasPermission,
      }),
    [activeBusiness, canAccess, hasPermission, subscriptionPlan]
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
    <div className="min-h-screen bg-gray-50/70 px-4 py-4 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-blue-200 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 p-6 text-white shadow-2xl shadow-slate-950/20 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Centro de aprendizaje
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Ayuda hecha para la app real que usas hoy
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
                Aqui encuentras recorridos guiados, ayuda por flujo y respuestas practicas filtradas segun el plan y modulos del negocio activo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Tutoriales visibles</div>
                <div className="mt-2 text-3xl font-semibold">{tutorials.length}</div>
                <div className="mt-2 text-sm text-slate-200">
                  Solo ves recorridos que si aplican al negocio activo.
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Cobertura</div>
                <div className="mt-2 text-lg font-semibold">Ventas, cobros, facturas, inventario, ajustes y sync</div>
                <div className="mt-2 text-sm text-slate-200">
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

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Filtrar por enfoque</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Cambia de categoria si quieres concentrarte solo en una parte del producto.
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
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
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
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
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
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
            className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900/50"
          >
            <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950 dark:text-white">Volver al inicio</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Salta al tablero para aplicar lo que acabas de aprender o revisar si algo cambio hoy.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-300">
              Abrir inicio <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            to="/settings?tab=membership"
            className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900/50"
          >
            <div className="inline-flex rounded-2xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
              <CircleHelp className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950 dark:text-white">Ver tu plan y membresia</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Revisa por que algunos modulos o tutoriales cambian segun el plan del negocio actual.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-300">
              Abrir membresia <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <button
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            className="rounded-[28px] border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900/50"
          >
            <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950 dark:text-white">Ir a dudas comunes</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Si no necesitas un recorrido completo, baja a las respuestas cortas y accionables.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-300">
              Ver preguntas utiles <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </section>

        <section id="tutoriales" className="space-y-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-950 dark:text-white">Tutoriales guiados</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Recorridos pensados para tareas reales, no para enumerar pantallas sin contexto.
            </p>
          </div>
          <HelpTutorialsSection query={query} selectedCategoryId={selectedCategory} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-semibold text-gray-950 dark:text-white">Guias cortas</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Aclaraciones utiles cuando no necesitas un recorrido completo.
            </p>

            <div className="mt-4 space-y-3">
              {guideCards.length > 0 ? (
                guideCards.map((card) => (
                  <article key={card.id} className="rounded-[24px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/70">
                    <h3 className="text-base font-semibold text-gray-950 dark:text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{card.body}</p>
                    {card.route ? (
                      <Link to={card.route} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-300">
                        Abrir pantalla relacionada <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No encontramos guias cortas con ese filtro. Prueba otra busqueda o vuelve a ver todas las categorias.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-semibold text-gray-950 dark:text-white">Preguntas utiles</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Respuestas rapidas para dudas que suelen aparecer despues del onboarding.
            </p>

            <div className="mt-4 space-y-3">
              {faqs.length > 0 ? (
                faqs.map((faq) => (
                  <article key={faq.id} className="rounded-[24px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/70">
                    <h3 className="text-base font-semibold text-gray-950 dark:text-white">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{faq.answer}</p>
                    {faq.relatedTutorialId ? (
                      <div className="mt-3 text-xs font-medium uppercase tracking-[0.22em] text-gray-400">
                        Tutorial relacionado: {tutorials.find((tutorial) => tutorial.id === faq.relatedTutorialId)?.title || 'Disponible en Ayuda'}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
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
