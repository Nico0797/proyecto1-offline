import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Briefcase, Check, Loader2, Sparkles, Store, Wallet, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useAccountAccessStore } from '../store/accountAccessStore';
import { useBusinessStore } from '../store/businessStore';
import { getCycleKey, membershipService, type PlanCode } from '../services/membershipService';
import { cn } from '../utils/cn';

const PLAN_ICONS = {
  basic: Store,
  pro: Sparkles,
  business: Briefcase,
} as const;

export const AccountAccessPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isHydrating } = useAuthStore();
  const fetchAuthBootstrap = useBusinessStore((state) => state.fetchAuthBootstrap);
  const {
    access,
    pricing,
    hasLoaded,
    isLoading,
    error,
    fetchStatus,
    startPreview,
  } = useAccountAccessStore();
  const [processingPlan, setProcessingPlan] = useState<PlanCode | null>(null);
  const [startingPreview, setStartingPreview] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchStatus().catch(() => undefined);
  }, [fetchStatus, isAuthenticated]);

  useEffect(() => {
    if (access?.active || access?.existing_access) {
      navigate('/dashboard', { replace: true });
    }
  }, [access?.active, access?.existing_access, navigate]);

  const cycleOptions = useMemo(() => {
    if (!pricing) return [];
    return pricing.cycle_order.map((cycle) => ({
      key: cycle,
      label: pricing.plans.pro.cycles[cycle].label,
      discountLabel: pricing.plans.pro.cycles[cycle].discount_label,
    }));
  }, [pricing]);

  if (isHydrating) {
    return (
      <div className="app-canvas flex min-h-screen items-center justify-center text-white">
        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        Restaurando tu sesión...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !hasLoaded) {
    return (
      <div className="app-canvas flex min-h-screen items-center justify-center text-white">
        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        Preparando tu acceso...
      </div>
    );
  }

  const handleSubscribe = async (planCode: PlanCode) => {
    try {
      setProcessingPlan(planCode);
      const url = await membershipService.createCheckout(planCode, 'card');
      window.open(url, '_blank');
    } catch (checkoutError: any) {
      alert(checkoutError?.message || 'No se pudo iniciar el pago');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleStartPreview = async () => {
    try {
      setStartingPreview(true);
      const nextAccess = await startPreview();
      await fetchAuthBootstrap(nextAccess?.demo_business_id ?? null);
      navigate('/dashboard', { replace: true });
    } catch (previewError: any) {
      alert(previewError?.response?.data?.error || previewError?.message || 'No se pudo abrir la vista previa');
    } finally {
      setStartingPreview(false);
    }
  };

  return (
    <div className="app-canvas min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(37,99,235,0.95)] backdrop-blur-xl sm:p-8">
          {access?.demo_preview_available ? (
            <button
              type="button"
              onClick={handleStartPreview}
              disabled={startingPreview || !!processingPlan}
              className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-slate-100 transition hover:border-white/20 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Cerrar planes y explorar negocio de ejemplo"
              title="Explorar negocio de ejemplo"
            >
              {startingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-5 w-5" />}
            </button>
          ) : null}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                <Wallet className="h-3.5 w-3.5" />
                Acceso inicial
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Elige cómo quieres empezar en EnCaja
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-base">
                Antes de entrar al negocio, elige tu suscripción inicial. Así activamos la experiencia correcta desde el primer ingreso y evitamos mostrarte herramientas que no necesitas todavía.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-200">
              <div className="font-semibold">Tu acceso se resuelve aquí primero</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-blue-100/70">
                Compra aprobada o acceso manual usan la misma regla
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-blue-300/15 bg-blue-500/10 px-4 py-3 text-sm text-blue-50/90">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
              <div>
                <div className="font-semibold">Luego podrás cambiar esto desde Personalización y Membresía.</div>
                <p className="mt-1 text-blue-50/80">La elección define tu configuración inicial, no una estructura permanente.</p>
              </div>
            </div>
          </div>

          {access?.demo_preview_available ? (
            <div className="mt-4 rounded-[24px] border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                <div>
                  <div className="font-semibold">¿Quieres explorar primero?</div>
                  <p className="mt-1 text-amber-50/80">
                    Cierra con la <strong>X</strong> para entrar al negocio de ejemplo en una <strong>vista previa interactiva</strong>.
                    Podrás abrir formularios, completar flujos y ver resultados temporales durante la sesión antes de activar tu plan.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {pricing ? (
            <>
              <div className="mt-8 flex justify-center">
                <div className="app-muted-panel rounded-2xl p-1">
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {cycleOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setBillingCycle(option.key)}
                        className={cn(
                          'relative rounded-xl px-5 py-2 text-sm font-medium transition-all',
                          billingCycle === option.key
                            ? 'app-surface text-gray-900 shadow dark:text-white'
                            : 'text-slate-300 hover:text-white'
                        )}
                      >
                        {option.label}
                        {option.discountLabel ? (
                          <span className="absolute -right-2 -top-3 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {option.discountLabel}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-3">
                {pricing.plan_order.map((planKey) => {
                  const plan = pricing.plans[planKey];
                  const cycle = plan.cycles[getCycleKey(billingCycle)];
                  const Icon = PLAN_ICONS[plan.key];
                  const isRecommended = Boolean(plan.badge);
                  const isProcessing = processingPlan === cycle.checkout_plan_code;

                  return (
                    <section
                      key={plan.key}
                      className={cn(
                        'relative overflow-hidden rounded-[30px] border p-6 shadow-[0_25px_90px_-60px_rgba(15,23,42,0.9)]',
                        isRecommended
                          ? 'border-blue-400/30 bg-[linear-gradient(180deg,rgba(59,130,246,0.18),rgba(15,23,42,0.92))]'
                          : 'border-white/10 bg-slate-950/80'
                      )}
                    >
                      {plan.badge ? (
                        <div className="absolute right-5 top-5 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                          {plan.badge}
                        </div>
                      ) : null}

                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10">
                        <Icon className="h-7 w-7 text-blue-100" />
                      </div>

                      <h2 className="mt-5 text-2xl font-semibold">{plan.display_name}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{plan.tagline}</p>

                      <div className="mt-6">
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-bold">${cycle.total_usd.toFixed(2)}</span>
                          <span className="pb-1 text-sm text-slate-300">/{cycle.label.toLowerCase()}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                          Equivale a ${cycle.monthly_equivalent_usd.toFixed(2)} por mes.
                        </p>
                      </div>

                      <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Qué pasa al elegirlo</div>
                        <p className="mt-3 text-sm leading-6 text-slate-200">{plan.highlight}</p>
                        <ul className="mt-4 space-y-3">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-3 text-sm text-slate-200">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Recomendado para</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {plan.recommended_for.map((item) => (
                            <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Button
                        className="mt-6 w-full"
                        onClick={() => handleSubscribe(cycle.checkout_plan_code)}
                        disabled={Boolean(processingPlan) || startingPreview}
                      >
                        {isProcessing ? 'Abriendo checkout...' : plan.cta_label}
                        {!isProcessing ? <ArrowRight className="h-4 w-4" /> : null}
                      </Button>
                    </section>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AccountAccessPage;
