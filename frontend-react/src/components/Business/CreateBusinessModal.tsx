import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  BriefcaseBusiness,
  ChefHat,
  Circle,
  CircleOff,
  ClipboardList,
  Coins,
  Factory,
  FileText,
  Landmark,
  Layers3,
  LayoutDashboard,
  Package,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Ticket,
  Truck,
  User,
  Users,
  Wand2,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { canAccessModule } from '../../auth/plan';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { useAccountAccessStore } from '../../store/accountAccessStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';
import { applyBusinessTypeConfiguration } from '../../config/businessPresetApplication';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import {
  buildBusinessOnboardingSummary,
  buildInitialSetupSettings,
  DEFAULT_BUSINESS_ONBOARDING_ANSWERS,
  getQuestionSetForFlow,
  getTutorialDisplayLabel,
  INITIAL_ONBOARDING_CHANGE_MESSAGE,
  resolveOnboardingFlow,
  type BusinessOnboardingWizardAnswers,
  type OnboardingFlow,
  type OnboardingOptionDefinition,
  type OnboardingQuestionDefinition,
  type OnboardingQuestionId,
  type OnboardingVisualTone,
} from '../../config/businessOperationalOnboarding';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type QuestionStep = OnboardingQuestionId;
type WizardScreenId = 'identity' | QuestionStep | 'summary';

const TONE_STYLES: Record<OnboardingVisualTone, { shell: string; badge: string; glow: string }> = {
  sunrise: {
    shell: 'border-amber-400/30 bg-[linear-gradient(180deg,rgba(251,191,36,0.18),rgba(15,23,42,0.78))] text-white',
    badge: 'bg-amber-400/15 text-amber-100',
    glow: 'from-amber-300/30 via-orange-300/10 to-transparent',
  },
  ocean: {
    shell: 'border-sky-400/30 bg-[linear-gradient(180deg,rgba(56,189,248,0.18),rgba(15,23,42,0.78))] text-white',
    badge: 'bg-sky-400/15 text-sky-100',
    glow: 'from-sky-300/30 via-cyan-300/10 to-transparent',
  },
  mint: {
    shell: 'border-emerald-400/30 bg-[linear-gradient(180deg,rgba(52,211,153,0.18),rgba(15,23,42,0.78))] text-white',
    badge: 'bg-emerald-400/15 text-emerald-100',
    glow: 'from-emerald-300/30 via-teal-300/10 to-transparent',
  },
  gold: {
    shell: 'border-yellow-300/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.18),rgba(15,23,42,0.78))] text-white',
    badge: 'bg-yellow-300/15 text-yellow-100',
    glow: 'from-yellow-200/30 via-amber-200/10 to-transparent',
  },
  rose: {
    shell: 'border-rose-400/30 bg-[linear-gradient(180deg,rgba(251,113,133,0.18),rgba(15,23,42,0.78))] text-white',
    badge: 'bg-rose-400/15 text-rose-100',
    glow: 'from-rose-300/30 via-pink-300/10 to-transparent',
  },
  ink: {
    shell: 'border-slate-400/20 bg-[linear-gradient(180deg,rgba(148,163,184,0.12),rgba(15,23,42,0.8))] text-white',
    badge: 'bg-white/10 text-white/90',
    glow: 'from-slate-300/20 via-slate-200/5 to-transparent',
  },
};

const ICON_MAP: Record<string, LucideIcon> = {
  package: Package,
  briefcase: BriefcaseBusiness,
  layers: Layers3,
  factory: Factory,
  boxes: Boxes,
  sparkles: Sparkles,
  wand: Wand2,
  zap: Zap,
  wallet: Wallet,
  'clipboard-list': ClipboardList,
  'file-text': FileText,
  landmark: Landmark,
  'shopping-bag': ShoppingBag,
  coins: Coins,
  tags: Tag,
  'layout-dashboard': LayoutDashboard,
  user: User,
  users: Users,
  shield: ShieldCheck,
  receipt: Receipt,
  ticket: Ticket,
  'circle-off': CircleOff,
  circle: Circle,
  'refresh-cw': RefreshCw,
  'chef-hat': ChefHat,
  truck: Truck,
};

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'COP', label: 'COP ($)' },
  { value: 'MXN', label: 'MXN ($)' },
];

const QUESTION_FIELD_MAP: Record<QuestionStep, keyof BusinessOnboardingWizardAnswers> = {
  operational_model: 'operationalModel',
  raw_materials_mode: 'rawMaterialsMode',
  recipe_mode: 'recipeMode',
  selling_mode: 'sellingMode',
  production_control: 'productionControl',
  sales_flow: 'salesFlow',
  home_focus: 'homeFocus',
  team_mode: 'teamMode',
  team_structure: 'teamStructure',
  role_setup: 'roleSetup',
  permission_control: 'permissionControl',
  owner_focus: 'ownerFocus',
  documents_mode: 'documentsMode',
  guidance_mode: 'guidanceMode',
};

const isQuestionScreen = (screenId: WizardScreenId): screenId is QuestionStep => {
  return screenId !== 'identity' && screenId !== 'summary';
};

const getProgressValue = (screenId: WizardScreenId, screens: WizardScreenId[]) => {
  if (screenId === 'summary') return 100;
  return Math.round(((screens.indexOf(screenId) + 1) / Math.max(screens.length - 1, 1)) * 100);
};

const QuestionOptionCard = <TValue extends string>({
  option,
  selected,
  onSelect,
}: {
  option: OnboardingOptionDefinition<TValue>;
  selected: boolean;
  onSelect: (value: TValue) => void;
}) => {
  const Icon = ICON_MAP[option.icon] || Sparkles;
  const tone = TONE_STYLES[option.tone];

  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={cn(
        'group relative overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99]',
        selected
          ? `${tone.shell} shadow-[0_20px_65px_-30px_rgba(14,165,233,0.9)]`
          : 'border-slate-200/80 bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-slate-950/80 dark:text-white dark:hover:border-white/20'
      )}
    >
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br blur-2xl', tone.glow)} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-2xl', selected ? tone.badge : 'bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-white')}>
            <Icon className="h-6 w-6" />
          </div>
          <div
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase',
              selected
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
            )}
          >
            {selected ? 'Elegido' : 'Disponible'}
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-lg font-semibold">{option.title}</h4>
          <p className={cn('mt-2 text-sm leading-6', selected ? 'text-white/82' : 'text-slate-600 dark:text-slate-300')}>
            {option.description}
          </p>
        </div>

        <div className="mt-5">
          <div className={cn('text-[11px] font-semibold uppercase tracking-[0.24em]', selected ? 'text-white/75' : 'text-slate-500 dark:text-slate-400')}>
            Lo deja listo con
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {option.activates.map((item) => (
              <span
                key={item}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  selected ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-slate-200'
                )}
              >
                {item}
              </span>
            ))}
          </div>
          <p className={cn('mt-3 text-sm leading-6', selected ? 'text-white/88' : 'text-slate-600 dark:text-slate-300')}>
            {option.benefit}
          </p>
        </div>
      </div>
    </button>
  );
};

const SummaryPill = ({ label }: { label: string }) => (
  <span className="rounded-full border border-blue-500/15 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-100">
    {label}
  </span>
);

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { addBusiness, businesses, updateBusiness, updateBusinessModules } = useBusinessStore();
  const { user } = useAuthStore();
  const { access } = useAccountAccessStore();
  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  const setPreferences = useNavigationPreferences((state) => state.setPreferences);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentScreen, setCurrentScreen] = useState<WizardScreenId>('identity');
  const [answers, setAnswers] = useState<BusinessOnboardingWizardAnswers>(DEFAULT_BUSINESS_ONBOARDING_ANSWERS);
  const onboardingFlow: OnboardingFlow =
    access?.onboarding_flow || resolveOnboardingFlow(user?.plan);
  const isSimpleStoreOnboarding = onboardingFlow === 'basic';
  const questionSet = useMemo(() => getQuestionSetForFlow(onboardingFlow), [onboardingFlow]);
  const wizardScreens = useMemo<WizardScreenId[]>(
    () => ['identity', ...questionSet.map((question) => question.id), 'summary'],
    [questionSet]
  );

  const onboardingSummary = useMemo(
    () => buildBusinessOnboardingSummary(answers, onboardingFlow),
    [answers, isSimpleStoreOnboarding, onboardingFlow]
  );
  const effectiveSummary = useMemo(() => {
    const allowedModules = onboardingSummary.activatedModules.filter((moduleKey) => canAccessModule(user?.plan, moduleKey));
    const canShowProducts = allowedModules.includes('products');
    const canShowCollections = allowedModules.includes('accounts_receivable');
    const canShowQuotes = allowedModules.includes('quotes');
    const canShowRawInventory = allowedModules.includes('raw_inventory');

    return {
      ...onboardingSummary,
      activatedModules: allowedModules,
      highlightedTools: onboardingSummary.highlightedTools.filter((tool) => {
        if (tool === 'Productos') return canShowProducts;
        if (tool === 'Cobros') return canShowCollections;
        if (tool === 'Cotizaciones') return canShowQuotes;
        if (tool === 'Inventario bodega') return canShowRawInventory;
        return true;
      }),
      recommendedTutorials: onboardingSummary.recommendedTutorials.filter((tutorialId) => {
        if (tutorialId === 'payments') return canShowCollections;
        if (tutorialId === 'products') return canShowProducts;
        if (tutorialId === 'invoices') return canShowQuotes || onboardingSummary.commercialSections.invoices;
        if (tutorialId === 'raw-inventory') return canShowRawInventory;
        return true;
      }),
    };
  }, [onboardingSummary, user?.plan]);

  const progress = getProgressValue(currentScreen, wizardScreens);
  const currentQuestion = useMemo(
    () => (isQuestionScreen(currentScreen) ? questionSet.find((question) => question.id === currentScreen) || null : null),
    [currentScreen, questionSet]
  );

  const filteredHighlightTools = useMemo(
    () => effectiveSummary.highlightedTools.slice(0, 5),
    [effectiveSummary.highlightedTools]
  );
  const filteredHiddenTools = useMemo(
    () => effectiveSummary.hiddenTools.slice(0, 5),
    [effectiveSummary.hiddenTools]
  );

  const screenIndex = wizardScreens.indexOf(currentScreen);
  const isFirstScreen = screenIndex <= 0;
  const isSummaryScreen = currentScreen === 'summary';
  const wizardStepTotal = Math.max(wizardScreens.length - 1, 1);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(false);
    setError('');
    setCurrentScreen('identity');
    setAnswers(DEFAULT_BUSINESS_ONBOARDING_ANSWERS);
  }, [isOpen]);

  useEffect(() => {
    if (!wizardScreens.includes(currentScreen)) {
      setCurrentScreen('identity');
    }
  }, [currentScreen, wizardScreens]);

  const canAdvance = useMemo(() => {
    if (currentScreen === 'identity') {
      return answers.name.trim().length >= 2 && !!answers.currency;
    }

    if (isQuestionScreen(currentScreen)) {
      return Boolean(answers[QUESTION_FIELD_MAP[currentScreen]]);
    }

    return true;
  }, [answers, currentScreen]);

  const focusPreviewLabel = useMemo(() => {
    if (effectiveSummary.prioritizedPath === '/dashboard' && effectiveSummary.initialDashboardTab === 'balance') {
      return 'Caja';
    }
    if (effectiveSummary.prioritizedPath === '/payments') return 'Cobros';
    if (effectiveSummary.prioritizedPath === '/products') return 'Productos';
    if (effectiveSummary.prioritizedPath === '/sales') return 'Ventas';
    return 'Resumen';
  }, [effectiveSummary.initialDashboardTab, effectiveSummary.prioritizedPath]);

  const handleClose = (force = false) => {
    if (loading && !force) return;
    setLoading(false);
    setError('');
    setCurrentScreen('identity');
    setAnswers(DEFAULT_BUSINESS_ONBOARDING_ANSWERS);
    onClose();
  };

  const goNext = () => {
    if (!canAdvance || isSummaryScreen) return;
    const nextScreen = wizardScreens[screenIndex + 1];
    if (nextScreen) setCurrentScreen(nextScreen);
  };

  const goBack = () => {
    if (isFirstScreen || loading) return;
    const previousScreen = wizardScreens[screenIndex - 1];
    if (previousScreen) setCurrentScreen(previousScreen);
  };

  const handleOptionSelect = <TValue extends string,>(
    question: OnboardingQuestionDefinition<TValue>,
    value: TValue
  ) => {
    const field = QUESTION_FIELD_MAP[question.id] as keyof BusinessOnboardingWizardAnswers;
    setAnswers((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const ownedBusinesses = businesses.filter((business) => business.user_id === user?.id);
    if (!['pro', 'business'].includes(user?.plan || '') && ownedBusinesses.length >= 1) {
      alert('Limite de negocios alcanzado. Actualiza tu plan para crear mas.');
      handleClose();
      return;
    }

    if (!isSummaryScreen) {
      goNext();
      return;
    }

    setLoading(true);
    try {
      const draftInitialSetup = buildInitialSetupSettings(answers, effectiveSummary, null);
      const newBusiness = await addBusiness({
        name: answers.name.trim(),
        currency: answers.currency,
        settings: {
          initial_setup: draftInitialSetup,
        },
      });

      const completedAt = new Date().toISOString();
      const completedInitialSetup = buildInitialSetupSettings(answers, effectiveSummary, completedAt);
      const scopeKey = getScopeKey(user?.id, newBusiness.id);

      await applyBusinessTypeConfiguration({
        business: newBusiness,
        businessType: effectiveSummary.businessType,
        recommendedModules: effectiveSummary.activatedModules,
        commercialSections: effectiveSummary.commercialSections,
        operationalProfile: effectiveSummary.operationalProfile,
        visibilityMode: effectiveSummary.visibilityMode,
        prioritizedPath: effectiveSummary.prioritizedPath,
        answers: effectiveSummary.personalizationAnswers,
        initialSetup: completedInitialSetup,
        plan: newBusiness.plan || user?.plan,
        setNavigationPreferences: (preferences) => setPreferences(scopeKey, preferences),
        updateBusiness,
        updateBusinessModules,
      });

      onSuccess();
      navigate(effectiveSummary.prioritizedPath || '/dashboard', { replace: true });
      handleClose(true);
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error || submitError?.message || 'No fue posible crear y configurar el negocio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Configura tu negocio"
      maxWidth="max-w-5xl"
      className="border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.98))]"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-5 text-white shadow-[0_30px_90px_-50px_rgba(37,99,235,0.9)] sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_28%)]" />
          <div className="relative space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Onboarding inicial
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Armemos una version de EnCaja que se sienta clara desde el primer minuto.
                </h2>
                <p className="mt-3 text-sm leading-6 text-blue-50/82 sm:text-base">
                  {isSimpleStoreOnboarding
                    ? 'Entraras con una configuracion simple y limpia para empezar rapido, sin preguntas extra.'
                    : onboardingFlow === 'business'
                      ? 'Te guiaremos paso a paso para activar la operacion y la organizacion del equipo que de verdad necesitas.'
                      : 'Te haremos una pregunta por pantalla para activar solo las herramientas que de verdad te sirven hoy.'}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-blue-50/85">
                <div className="font-semibold">Paso {Math.min(screenIndex + 1, wizardStepTotal)} de {wizardStepTotal}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-blue-100/70">
                  {isSimpleStoreOnboarding ? 'Menos de 1 minuto' : onboardingFlow === 'business' ? 'Menos de 3 minutos' : 'Menos de 2 minutos'}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/75">
                <span>Progreso</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-blue-300/15 bg-blue-500/10 px-4 py-3 text-sm text-blue-50/90">
              <div className="flex items-start gap-3">
                <BadgeDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
                <div>
                  <div className="font-semibold">Tu configuracion no es permanente.</div>
                  <p className="mt-1 leading-6 text-blue-50/78">{INITIAL_ONBOARDING_CHANGE_MESSAGE}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {currentScreen === 'identity' && (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="rounded-[30px] border border-white/10 bg-slate-950/75 p-5 text-white shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] sm:p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/80">
                Paso 1
              </div>
              <h3 className="mt-4 text-2xl font-semibold">Primero, cuentame como se llama tu negocio.</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {isSimpleStoreOnboarding
                  ? 'Con esto abrimos tu espacio y dejamos lista una tienda simple para que puedas entrar sin preguntas extra.'
                  : 'Con esto abrimos tu espacio y dejamos lista la moneda principal para que todo arranque bien desde el inicio.'}
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Nombre del negocio</label>
                  <Input
                    value={answers.name}
                    onChange={(e) =>
                      setAnswers((current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                    required
                    placeholder="Ej: Cafe Luna, Mis Postres, Tienda Central"
                    className="w-full border-white/10 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white dark:text-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Moneda principal</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={answers.currency}
                    onChange={(e) =>
                      setAnswers((current) => ({
                        ...current,
                        currency: e.target.value,
                      }))
                    }
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.value} value={currency.value} className="bg-slate-950 text-white">
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,165,233,0.14),rgba(15,23,42,0.88))] p-5 text-white sm:p-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10">
                <Sparkles className="h-7 w-7 text-blue-100" />
              </div>
              <h4 className="mt-5 text-xl font-semibold">Lo que haremos despues</h4>
              <div className="mt-4 space-y-3 text-sm leading-6 text-blue-50/80">
                {isSimpleStoreOnboarding ? (
                  <>
                    <p>Entraras con una configuracion simple para vender rapido, tener catalogo basico y ver una app mas limpia desde el primer momento.</p>
                    <p>Si luego necesitas algo mas avanzado, podras cambiar modulos y personalizacion cuando quieras.</p>
                  </>
                ) : (
                  <>
                    <p>Te mostrare una pregunta por pantalla para entender como vendes, que quieres ver primero y que herramientas vale la pena activar.</p>
                    <p>Cada respuesta te explicara que se enciende y para que sirve, sin lenguaje tecnico ni decisiones irreversibles.</p>
                  </>
                )}
              </div>

              <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Vista previa</div>
                <div className="mt-3 text-lg font-semibold">{answers.name.trim() || 'Tu negocio'}</div>
                <div className="mt-1 text-sm text-blue-50/75">Moneda base: {answers.currency}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SummaryPill label="Configuracion guiada" />
                  <SummaryPill label="Menos ruido al entrar" />
                  <SummaryPill label="Todo editable luego" />
                </div>
              </div>
            </div>
          </section>
        )}

        {currentQuestion && (
          <section className="space-y-5">
            <div className="rounded-[30px] border border-white/10 bg-slate-950/80 p-5 text-white shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] sm:p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/75">{currentQuestion.eyebrow}</div>
              <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <h3 className="text-2xl font-semibold">{currentQuestion.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">{currentQuestion.description}</p>
                </div>
                <div className="max-w-sm rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {currentQuestion.helper}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const field = QUESTION_FIELD_MAP[currentQuestion.id];
                const selected = answers[field] === option.value;

                return (
                  <QuestionOptionCard
                    key={option.value}
                    option={option as OnboardingOptionDefinition<string>}
                    selected={selected}
                    onSelect={(value) => handleOptionSelect(currentQuestion as OnboardingQuestionDefinition<string>, value)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {currentScreen === 'summary' && (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="rounded-[30px] border border-white/10 bg-slate-950/80 p-5 text-white shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] sm:p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                <Sparkles className="h-3.5 w-3.5" />
                Resumen final
              </div>
              <h3 className="mt-4 text-2xl font-semibold">{effectiveSummary.headline}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">{effectiveSummary.summary}</p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Vista principal</div>
                  <div className="mt-3 text-lg font-semibold">{focusPreviewLabel}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Tu negocio abrira con esta vista sugerida para que lo importante te quede mas cerca.
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Modelo operativo</div>
                  <div className="mt-3 text-lg font-semibold">{effectiveSummary.operationalModelLabel}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Esta sera la logica base guardada para inventario, produccion, bodega y cumplimiento comercial.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Nivel inicial</div>
                  <div className="mt-3 text-lg font-semibold">
                    {effectiveSummary.simplicityLevel === 'simple'
                      ? 'Simple y directo'
                      : effectiveSummary.simplicityLevel === 'guided'
                        ? 'Guiado'
                        : 'Mas completo'}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Lo ajustamos segun la complejidad real de tu operacion y tu forma de trabajar.
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Herramientas activadas</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filteredHighlightTools.map((tool) => (
                      <SummaryPill key={tool} label={tool} />
                    ))}
                  </div>
                  {effectiveSummary.highlightedTools.length > filteredHighlightTools.length ? (
                    <div className="mt-3 text-sm text-slate-300">
                      y {effectiveSummary.highlightedTools.length - filteredHighlightTools.length} mas listas para ti.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Quedaran ocultas por ahora</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {filteredHiddenTools.length > 0 ? (
                    filteredHiddenTools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200"
                      >
                        {tool}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-300">No ocultaremos nada importante en esta configuracion inicial.</span>
                  )}
                </div>
                {effectiveSummary.hiddenTools.length > filteredHiddenTools.length ? (
                  <div className="mt-3 text-sm text-slate-300">
                    y {effectiveSummary.hiddenTools.length - filteredHiddenTools.length} cambios mas para mantener la vista limpia.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,165,233,0.14),rgba(15,23,42,0.88))] p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Recorridos recomendados</div>
                <p className="mt-3 text-sm leading-6 text-blue-50/82">
                  Dejaremos sugeridas estas guias para que el primer recorrido se sienta acompanado y claro.
                </p>
                <div className="mt-4 space-y-2">
                  {effectiveSummary.recommendedTutorials.map((tutorialId) => (
                    <div key={tutorialId} className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm">
                      {getTutorialDisplayLabel(tutorialId)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-emerald-400/20 bg-emerald-500/10 p-5 text-white">
                <div className="text-sm font-semibold">Podras cambiar todo esto mas adelante.</div>
                <p className="mt-2 text-sm leading-6 text-emerald-50/88">
                  Si tu negocio cambia, crece o simplemente prefieres otra vista, podras ajustar modulos, herramientas visibles y personalizacion cuando quieras.
                </p>
              </div>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-300">
            {currentScreen === 'summary'
              ? 'Revisa el resumen y entra a tu negocio cuando quieras.'
              : isSimpleStoreOnboarding
                ? 'Dejaremos una configuracion inicial simple para que empieces rapido.'
                : 'Una pregunta a la vez para dejar tu negocio claro desde el primer ingreso.'}
          </div>

          <div className="flex flex-wrap gap-3">
            {!isFirstScreen ? (
              <Button variant="outline" type="button" onClick={goBack} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            ) : null}

            <Button variant="outline" type="button" onClick={() => handleClose()} disabled={loading}>
              Cancelar
            </Button>

            <Button type="submit" disabled={loading || !canAdvance}>
              {loading ? (
                'Preparando tu negocio...'
              ) : isSummaryScreen ? (
                <>
                  Entrar a mi negocio
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
