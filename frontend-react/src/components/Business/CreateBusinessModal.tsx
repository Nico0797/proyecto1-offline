import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  Package,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import { applyBusinessTypeConfiguration } from '../../config/businessPresetApplication';
import {
  applyPresetToBusinessSettings,
  buildInitialSetupFromPreset,
  buildOperationalProfileFromPreset,
} from '../../config/businessPresets';
import type {
  BusinessCommercialSectionsState,
  BusinessInitialSetupSettings,
} from '../../config/businessPersonalizationCompat';
import type { BusinessOperationalProfile } from '../../config/businessOperationalProfile';
import {
  applyBusinessPreset,
  getBusinessPresetFromAnswers,
  getGranularPresetChoices,
  MODULE_CATEGORIES,
  ONBOARDING_MODULE_OPTIONS,
  type BusinessVisibilityId,
  type OnboardingAnswers,
  type OnboardingSellsAnswer,
  type OnboardingTeamAnswer,
  type OnboardingWorkflowAnswer,
} from '../../config/businessOnboardingPresets';
import type { BusinessTypeKey } from '../../config/businessPresets';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type OnboardingStep = 'sells' | 'workflow' | 'team' | 'modules' | 'summary';

const STEP_ORDER: OnboardingStep[] = ['sells', 'workflow', 'team', 'modules', 'summary'];

const CURRENCY_OPTIONS = [
  { value: 'COP', label: 'COP ($)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR' },
  { value: 'MXN', label: 'MXN ($)' },
];

const ChoiceCard = ({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full rounded-[24px] border p-5 text-left transition-all',
      selected
        ? 'border-blue-400/30 bg-blue-500/12 shadow-[0_18px_48px_-30px_rgba(59,130,246,0.8)]'
        : 'border-white/10 bg-slate-950/70 hover:border-white/20 hover:bg-slate-900/90',
    )}
  >
    <div className="flex items-start gap-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', selected ? 'bg-blue-400/15 text-blue-100' : 'bg-white/8 text-white')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-white">{title}</span>
          {selected ? (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/30">
              <Check className="h-3.5 w-3.5 text-blue-100" />
            </div>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </div>
  </button>
);

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { addBusiness, updateBusiness, updateBusinessModules, fetchAuthBootstrap } = useBusinessStore();
  const { user, activeContext, selectContext } = useAuthStore();
  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  const setPreferences = useNavigationPreferences((state) => state.setPreferences);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<OnboardingStep>('sells');
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [selectedPresetKey, setSelectedPresetKey] = useState<BusinessTypeKey>('simple_store');
  const [sells, setSells] = useState<OnboardingSellsAnswer>('products');
  const [workflow, setWorkflow] = useState<OnboardingWorkflowAnswer>('orders');
  const [team, setTeam] = useState<OnboardingTeamAnswer>('solo');
  const [visibleModules, setVisibleModules] = useState<BusinessVisibilityId[]>([]);
  const presetChoices = useMemo(() => getGranularPresetChoices(), []);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(false);
    setError('');
    setStep('sells');
    setBusinessName('');
    setCurrency('COP');
    setSelectedPresetKey('simple_store');
    setSells('products');
    setWorkflow('orders');
    setTeam('solo');
    setVisibleModules([]);
  }, [isOpen]);

  const answers: OnboardingAnswers = useMemo(
    () => ({
      sells,
      workflow,
      team,
      visibleModules,
      granularPresetKey: selectedPresetKey,
    }),
    [selectedPresetKey, sells, team, visibleModules, workflow],
  );

  const preset = useMemo(() => getBusinessPresetFromAnswers(answers), [answers]);
  const currentIndex = STEP_ORDER.indexOf(step);

  useEffect(() => {
    setVisibleModules(preset.visibleModules);
  }, [preset.businessType, preset.granularPresetKey, team]);

  const toggleModule = useCallback((id: BusinessVisibilityId) => {
    setVisibleModules((prev) =>
      prev.includes(id) ? prev.filter((current) => current !== id) : [...prev, id],
    );
  }, []);

  const canContinue = useMemo(() => {
    if (step === 'modules') return visibleModules.length > 0;
    if (step === 'summary') return businessName.trim().length >= 2 && Boolean(currency) && visibleModules.length > 0;
    return true;
  }, [businessName, currency, step, visibleModules.length]);

  const goBack = () => {
    if (currentIndex <= 0 || loading) return;
    setStep(STEP_ORDER[currentIndex - 1]);
  };

  const goNext = () => {
    if (loading || currentIndex >= STEP_ORDER.length - 1) return;
    setStep(STEP_ORDER[currentIndex + 1]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (step !== 'summary') {
      if (canContinue) goNext();
      return;
    }

    if (!businessName.trim()) {
      setError('Agrega un nombre para continuar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      applyBusinessPreset(preset.businessType);

      const rawInitialSetup = buildInitialSetupFromPreset(preset.granularPreset);
      const presetSettings = applyPresetToBusinessSettings(
        { initial_setup: rawInitialSetup },
        preset.granularPresetKey,
        { applyModules: true, applyOnboarding: true },
      );

      const newBusiness = await addBusiness({
        name: businessName.trim(),
        currency,
        settings: presetSettings,
      });

      const completedAt = new Date().toISOString();
      const completedInitialSetup = {
        ...rawInitialSetup,
        onboarding_completed: true,
        onboarding_completed_at: completedAt,
      } as BusinessInitialSetupSettings;

      const scopeKey = getScopeKey(user?.id, newBusiness.id);
      const operationalProfile = buildOperationalProfileFromPreset(preset.granularPreset) as unknown as BusinessOperationalProfile;

      await applyBusinessTypeConfiguration({
        business: newBusiness,
        businessType: preset.granularPresetKey,
        simpleBusinessType: preset.businessType,
        recommendedModules: preset.enabledBusinessModules,
        commercialSections: preset.commercialSections as BusinessCommercialSectionsState,
        operationalProfile,
        visibilityMode: preset.granularPreset.simplicityLevel === 'simple' ? 'basic' : 'advanced',
        prioritizedPath: preset.granularPreset.prioritizedPath,
        initialSetup: completedInitialSetup,
        plan: newBusiness.plan || user?.plan,
        setNavigationPreferences: (preferences) => setPreferences(scopeKey, preferences),
        updateBusiness,
        updateBusinessModules,
      });

      selectContext({
        business_id: newBusiness.id,
        name: newBusiness.name,
        role: newBusiness.role || 'owner',
        type: activeContext?.type || 'owned',
        permissions: [
          ...(newBusiness.permissions || []),
          ...(newBusiness.permissions_canonical || []),
        ],
      });

      await fetchAuthBootstrap(newBusiness.id);

      onSuccess();
      navigate(preset.granularPreset.prioritizedPath || '/dashboard', { replace: true });
      onClose();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error || submitError?.message || 'No fue posible crear el negocio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onClose}
      title="Configura tu negocio"
      maxWidth="max-w-2xl"
      className="border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.98))]"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-2 px-1">
          {STEP_ORDER.map((stepId, index) => (
            <div
              key={stepId}
              className={cn('h-1.5 flex-1 rounded-full transition-colors', index <= currentIndex ? 'bg-blue-500' : 'bg-white/10')}
            />
          ))}
        </div>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/70">Base del negocio</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.45fr_0.9fr]">
            <Input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Nombre del negocio"
              className="w-full border-white/10 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white dark:text-slate-900"
            />
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-950 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {step === 'sells' ? (
          <section className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/75">Paso 1 de {STEP_ORDER.length}</div>
            <h3 className="mt-3 text-2xl font-semibold">Elige el tipo que mas se parece a tu negocio</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Este preset define la base inicial. Luego afinas el modo operativo y lo visible desde Personalizacion.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {presetChoices.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setSelectedPresetKey(option.key);
                    if (option.operationalBusinessType === 'services') {
                      setSells('services');
                      setWorkflow('appointments');
                    } else if (option.operationalBusinessType === 'hybrid') {
                      setSells('both');
                      setWorkflow('both');
                    } else {
                      setSells('products');
                      setWorkflow('orders');
                    }
                  }}
                  className={cn(
                    'rounded-[24px] border p-4 text-left transition-all',
                    selectedPresetKey === option.key
                      ? 'border-blue-400/30 bg-blue-500/12 shadow-[0_18px_48px_-30px_rgba(59,130,246,0.8)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-white">{option.title}</div>
                      <p className="mt-1 text-sm leading-5 text-slate-300">{option.description}</p>
                    </div>
                    {selectedPresetKey === option.key ? (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/25">
                        <Check className="h-4 w-4 text-blue-100" />
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/75">Modo operativo</div>
              <h4 className="mt-2 text-xl font-semibold">Que vende tu negocio?</h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Esta capa controla si activamos Agenda, Pedidos o ambos por defecto.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <ChoiceCard selected={sells === 'products'} onClick={() => setSells('products')} icon={Package} title="Productos" description="Vendes articulos, inventario o productos fisicos." />
              <ChoiceCard selected={sells === 'services'} onClick={() => setSells('services')} icon={Wrench} title="Servicios" description="Atiendes citas, trabajos, asesorias o encargos." />
              <ChoiceCard selected={sells === 'both'} onClick={() => setSells('both')} icon={Sparkles} title="Ambos" description="Combinas productos y servicios en el mismo negocio." />
            </div>
          </section>
        ) : null}

        {step === 'workflow' ? (
          <section className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/75">Paso 2 de {STEP_ORDER.length}</div>
            <h3 className="mt-3 text-2xl font-semibold">Como trabajas normalmente?</h3>
            <div className="mt-6 space-y-3">
              <ChoiceCard selected={workflow === 'orders'} onClick={() => setWorkflow('orders')} icon={ClipboardList} title="Por pedidos" description="Recibes pedidos y los entregas cuando estan listos." />
              <ChoiceCard selected={workflow === 'appointments'} onClick={() => setWorkflow('appointments')} icon={CalendarDays} title="Por citas / agenda" description="Atiendes por turnos, reservas o agenda." />
              <ChoiceCard selected={workflow === 'both'} onClick={() => setWorkflow('both')} icon={Sparkles} title="Ambas" description="Manejas pedidos y tambien agenda segun el caso." />
            </div>
          </section>
        ) : null}

        {step === 'team' ? (
          <section className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/75">Paso 3 de {STEP_ORDER.length}</div>
            <h3 className="mt-3 text-2xl font-semibold">Trabajas solo o con equipo?</h3>
            <div className="mt-6 space-y-3">
              <ChoiceCard selected={team === 'solo'} onClick={() => setTeam('solo')} icon={Sparkles} title="Trabajo solo" description="Manejas la operacion principal por tu cuenta." />
              <ChoiceCard selected={team === 'team'} onClick={() => setTeam('team')} icon={Users} title="Tengo empleados / colaboradores" description="Hay otras personas atendiendo, vendiendo o ejecutando." />
            </div>
          </section>
        ) : null}

        {step === 'modules' ? (
          <section className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/75">Paso 4 de {STEP_ORDER.length}</div>
            <h3 className="mt-3 text-2xl font-semibold">Que quieres tener visible desde el primer dia?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Ya preseleccionamos lo recomendado para <span className="font-semibold text-blue-200">{preset.rules.label}</span>. Puedes ajustarlo aqui.
            </p>
            <div className="mt-6 space-y-5">
              {MODULE_CATEGORIES.map((category) => {
                const items = ONBOARDING_MODULE_OPTIONS.filter((option) => option.category === category.id);
                if (!items.length) return null;
                return (
                  <div key={category.id}>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70">{category.title}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {items.map((option) => {
                        const active = visibleModules.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleModule(option.id)}
                            className={cn(
                              'rounded-2xl border px-3 py-3 text-left transition-all',
                              active ? 'border-blue-400/30 bg-blue-500/12' : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-sm font-semibold text-white">{option.label}</span>
                              {active ? <Check className="h-3.5 w-3.5 text-blue-300" /> : null}
                            </div>
                            <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === 'summary' ? (
          <section className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/75">Paso 5 de {STEP_ORDER.length}</div>
              <h3 className="mt-3 text-2xl font-semibold">Te recomendamos esta configuracion</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Entraras con una base clara y luego podras cambiarla desde <span className="font-semibold text-blue-200">Personalizacion</span>.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100/70">Tipo detectado</div>
                  <div className="mt-2 text-lg font-semibold">{preset.rules.label}</div>
                  <p className="mt-1 text-sm text-slate-400">{preset.rules.description}</p>
                  <div className="mt-3 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-slate-100">
                    Preset real: {preset.granularPreset.name}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100/70">Accesos visibles</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {visibleModules.map((id) => {
                      const option = ONBOARDING_MODULE_OPTIONS.find((item) => item.id === id) || null;
                      return (
                        <span key={id} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-slate-100">
                          {option?.label || id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100/70">Internamente activamos</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preset.enabledBusinessModules.map((moduleKey) => (
                    <span key={moduleKey} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-slate-100">
                      {moduleKey}
                    </span>
                  ))}
                  {preset.showOrders ? <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] font-medium text-blue-100">Pedidos visibles</span> : null}
                  {preset.showAgenda ? <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-[11px] font-medium text-purple-100">Agenda visible</span> : null}
                  {preset.usesEmployees ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-100">Equipo activo</span> : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-400">
            {step === 'summary' ? 'Podras cambiar todo despues desde Personalizacion.' : `Paso ${currentIndex + 1} de ${STEP_ORDER.length}`}
          </div>

          <div className="flex flex-wrap gap-3">
            {currentIndex > 0 ? (
              <Button variant="outline" type="button" onClick={goBack} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            ) : null}

            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>

            <Button type="submit" disabled={!canContinue || loading}>
              {loading ? 'Preparando negocio...' : step === 'summary' ? 'Crear y entrar' : 'Continuar'}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
