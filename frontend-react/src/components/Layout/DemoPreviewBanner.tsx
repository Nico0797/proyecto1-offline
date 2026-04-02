import { Eye, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useDemoPreview } from '../../hooks/useDemoPreview';

const baseBadgeClassName =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur';

export const DemoPreviewBanner = () => {
  const navigate = useNavigate();
  const { isDemoPreview, demoBusinessName } = useDemoPreview();

  if (!isDemoPreview) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 border-b border-sky-400/15 bg-[linear-gradient(180deg,rgba(8,15,32,0.94),rgba(12,22,42,0.9))] px-3 py-2.5 shadow-[0_18px_40px_-28px_rgba(2,6,23,0.9)] backdrop-blur-xl lg:px-5">
      <div className="mx-auto max-w-[1600px]">
        <div className="relative overflow-hidden rounded-2xl border border-sky-400/16 bg-[linear-gradient(135deg,rgba(14,23,43,0.92),rgba(17,24,39,0.84))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-4 lg:px-4.5">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,rgba(56,189,248,0.95),rgba(168,85,247,0.8))]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_right,rgba(168,85,247,0.12),transparent_30%)]" />

          <div className="relative flex flex-col gap-3 sm:gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 pl-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className={`${baseBadgeClassName} border-sky-400/20 bg-sky-400/10 text-sky-100`}>
                  <Eye className="h-3.5 w-3.5 text-sky-300" />
                  Vista previa
                </span>
                <span className={`${baseBadgeClassName} border-violet-400/18 bg-violet-400/10 text-violet-100`}>
                  <Lock className="h-3.5 w-3.5 text-violet-300" />
                  Sin persistencia
                </span>
                <span className={`${baseBadgeClassName} border-white/10 bg-white/[0.05] text-slate-200`}>
                  Negocio de ejemplo
                </span>
              </div>

              <div className="mt-2.5 flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-50 sm:text-[15px]">
                  Estás explorando {demoBusinessName || 'un negocio de ejemplo'}
                </p>
                <p className="text-xs leading-5 text-slate-300 sm:text-[13px]">
                  Puedes probar formularios y recorridos completos, pero los cambios no se guardan hasta activar un plan.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center pl-2 lg:pl-0">
              <Button
                type="button"
                data-preview-allow="true"
                className="min-h-10 rounded-xl bg-[linear-gradient(135deg,#e0f2fe,#dbeafe)] px-4 text-slate-950 shadow-[0_14px_30px_-22px_rgba(56,189,248,0.65)] hover:bg-[linear-gradient(135deg,#f0f9ff,#e0e7ff)]"
                onClick={() => navigate('/account-access')}
              >
                <Sparkles className="h-4 w-4" />
                Activar plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
