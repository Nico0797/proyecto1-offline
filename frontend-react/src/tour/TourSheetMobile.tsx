import { useRef } from 'react';
import { TourStep } from './tourRegistry';
import { X, ChevronLeft, ChevronRight, MousePointerClick, AlertCircle } from 'lucide-react';

interface TourSheetMobileProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onStop: () => void;
  waitingAction: boolean;
  isFallback?: boolean;
}

export const TourSheetMobile = ({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onStop,
  waitingAction,
  isFallback
}: TourSheetMobileProps) => {
  const isLast = stepIndex + 1 >= totalSteps;
  const lastInteractionRef = useRef(0);

  // Guard for double execution (touch + click)
  const handleNext = (_e: React.MouseEvent | React.PointerEvent) => {
    // Prevent double firing if both events happen quickly
    const now = Date.now();
    if (now - lastInteractionRef.current < 300) {
      return;
    }
    lastInteractionRef.current = now;

    if (isLast) onStop();
    else onNext();
  };

  const borderColor = isFallback ? 'border-amber-500/50' : 'border-gray-700';
  const shadowColor = isFallback ? 'shadow-amber-900/20' : 'shadow-2xl';

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 pb-[env(safe-area-inset-bottom)] animate-slide-up pointer-events-auto touch-manipulation">
      <div className={`bg-gray-900 text-white border ${borderColor} rounded-2xl ${shadowColor} overflow-hidden flex flex-col max-h-[50vh] transition-colors duration-300`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-start shrink-0">
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-lg text-white pr-4 flex items-center gap-2">
              {isFallback && <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />}
              {step.title}
            </h3>
            {isFallback && (
              <div className="text-amber-200/90 text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 rounded mt-1">
                No encontramos el elemento resaltado en tu pantalla. Puede estar en otra pestaña, requerir abrir un modal o no aplicar a esta vista.
              </div>
            )}
            {step.allowInteraction && waitingAction && (
              <div className="text-cyan-100 text-xs bg-cyan-500/10 border border-cyan-500/20 px-2 py-1.5 rounded mt-1">
                Usa el elemento resaltado para seguir. Cuando abras la siguiente vista, el tour avanzará solo.
              </div>
            )}
          </div>
          <button 
            onClick={onSkip} 
            className="text-gray-400 hover:text-white p-1 touch-manipulation"
            aria-label="Cerrar tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="px-5 py-4 overflow-y-auto overscroll-contain">
          <ul className="space-y-3">
            {(step.body || []).map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-950/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col justify-center">
             <span className="text-xs text-gray-500 font-medium bg-gray-800 px-2 py-1 rounded self-start">
               {stepIndex + 1} / {totalSteps}
             </span>
             {step.allowInteraction && waitingAction && (
               <span className="text-cyan-400 text-xs flex items-center gap-1 animate-pulse mt-1">
                 <MousePointerClick className="w-3 h-3" /> Interactúa
               </span>
             )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onPrev} 
              disabled={stepIndex === 0}
              className="p-3 rounded-xl bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-800 transition-colors touch-manipulation"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex gap-2">
                <button
                onClick={handleNext}
                onPointerUp={(e) => {
                  // Fallback for Android webviews where onClick might be swallowed
                  if (e.pointerType === 'touch') {
                    handleNext(e);
                  }
                }}
                disabled={step.allowInteraction && waitingAction}
                className={`
                    px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg
                    bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30 active:scale-95 disabled:opacity-50 disabled:hover:bg-cyan-600 disabled:active:scale-100
                    touch-manipulation
                `}
                >
                {isLast ? 'Finalizar' : 'Siguiente'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
