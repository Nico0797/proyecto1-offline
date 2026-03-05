import { TourStep } from './tourRegistry';
import { X, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';

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

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2147483648] p-4 pb-[env(safe-area-inset-bottom)] animate-slide-up">
      <div className="bg-gray-900 text-white border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[50vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-start shrink-0">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg text-white pr-4">{step.title}</h3>
            {isFallback && <span className="text-amber-400 text-xs mt-1">Elemento no visible</span>}
          </div>
          <button onClick={onSkip} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="px-5 py-4 overflow-y-auto">
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
              className="p-3 rounded-xl bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => {
                if (isLast) onStop();
                else onNext();
              }}
              disabled={waitingAction}
              className={`
                px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg
                ${waitingAction 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30 active:scale-95'}
              `}
            >
              {isLast ? 'Finalizar' : 'Siguiente'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
