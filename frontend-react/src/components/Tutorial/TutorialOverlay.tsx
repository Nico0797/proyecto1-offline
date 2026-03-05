import { useEffect, useMemo, useRef, useState } from 'react';
import { useTutorialStore } from '../../store/tutorialStore';
import { TUTORIAL_MODULES } from '../../data/tutorialRegistry';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export const TutorialOverlay = () => {
  const { activeModule, currentStep, isTutorialActive, nextStep, prevStep, completeModule, skipModule, stopTutorial } = useTutorialStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const lastTarget = useRef<HTMLElement | null>(null);

  const step = useMemo(() => {
    if (!activeModule) return null;
    const mod = TUTORIAL_MODULES[activeModule];
    if (!mod) return null;
    return mod.steps[currentStep] || null;
  }, [activeModule, currentStep]);

  useEffect(() => {
    if (!isTutorialActive || !step) {
      if (lastTarget.current) {
        lastTarget.current.style.boxShadow = '';
        lastTarget.current = null;
      }
      setTargetRect(null);
      return;
    }
    if (step.route && window.location.pathname !== step.route) {
      return;
    }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const r = el.getBoundingClientRect();
      setTargetRect(r);
      if (lastTarget.current && lastTarget.current !== el) {
        lastTarget.current.style.boxShadow = '';
      }
      el.style.boxShadow = '0 0 0 3px rgba(34,211,238,0.9), 0 0 30px rgba(34,211,238,0.6)';
      lastTarget.current = el;
      setPlacement(step.position || 'bottom');
    } else {
      setTargetRect(null);
    }
  }, [isTutorialActive, step]);

  const isLast = (() => {
    if (!activeModule) return false;
    const mod = TUTORIAL_MODULES[activeModule];
    return currentStep >= mod.steps.length - 1;
  })();

  const onClose = () => {
    if (activeModule) skipModule(activeModule);
  };
  const onNext = () => {
    if (isLast) {
      if (activeModule) completeModule(activeModule);
      return;
    }
    nextStep();
  };

  const tooltipStyle: React.CSSProperties = (() => {
    const base: any = { position: 'fixed' };
    if (!targetRect) return { bottom: 40, right: 40 };
    const gap = 12;
    if (placement === 'bottom') {
      base.top = Math.min(window.innerHeight - 160, targetRect.bottom + gap);
      base.left = Math.max(16, Math.min(window.innerWidth - 360, targetRect.left));
    } else if (placement === 'top') {
      base.top = Math.max(16, targetRect.top - 140 - gap);
      base.left = Math.max(16, Math.min(window.innerWidth - 360, targetRect.left));
    } else if (placement === 'left') {
      base.top = Math.max(16, targetRect.top);
      base.left = Math.max(16, targetRect.left - 360 - gap);
    } else {
      base.top = Math.max(16, targetRect.top);
      base.left = Math.min(window.innerWidth - 360, targetRect.right + gap);
    }
    return base;
  })();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  // Render nothing when tutorial inactive, but keep hooks order stable
  if (!isTutorialActive || !step) return null;

  // Avoid rendering overlay visuals until estamos en la ruta correcta
  const routeMismatch = !!(step?.route && window.location.pathname !== step.route);
  if (routeMismatch) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose} />
      {targetRect && (
        <div
          className="absolute border-2 border-cyan-400 rounded-xl pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 30px rgba(34,211,238,0.6)',
          }}
        />
      )}
      <div
        className="w-[340px] bg-gray-900 text-white border border-cyan-700/40 rounded-2xl shadow-2xl p-4 pointer-events-auto"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">{step.title}</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={stopTutorial} 
              className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs" 
              aria-label="Detener tutorial"
            >
              Detener
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-300 mb-4">{step.content}</div>
        <div className="flex items-center justify-between">
          <button onClick={prevStep} className="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Atrás
          </button>
          <div className="text-xs text-gray-400">{currentStep + 1}</div>
          <button onClick={onNext} className="px-3 py-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 text-sm flex items-center gap-1">
            {isLast ? <><Check className="w-4 h-4" /> Finalizar</> : <>Siguiente <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
};
