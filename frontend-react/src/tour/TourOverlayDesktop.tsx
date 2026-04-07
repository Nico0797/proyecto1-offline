import { TourStep } from './tourRegistry';
import { X, ChevronLeft, ChevronRight, MousePointerClick, AlertCircle } from 'lucide-react';
import { forwardRef } from 'react';

interface TourOverlayDesktopProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onStop: () => void;
  waitingAction: boolean;
  position: { top: number; left: number; arrow: string };
  isFallback?: boolean;
}

export const TourOverlayDesktop = forwardRef<HTMLDivElement, TourOverlayDesktopProps>(({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onStop,
  waitingAction,
  position,
  isFallback
}, ref) => {
  const isLast = stepIndex + 1 >= totalSteps;

  // Arrow positioning logic
  const getArrowStyle = () => {
    const base = "absolute w-3 h-3 bg-gray-900 border-gray-700 transform rotate-45";
    switch (position.arrow) {
      case 'top': // Popover is above, arrow points down
        return { className: `${base} border-b border-r`, style: { bottom: '-6.5px', left: 'calc(50% - 6px)' } };
      case 'bottom': // Popover is below, arrow points up
        return { className: `${base} border-t border-l`, style: { top: '-6.5px', left: 'calc(50% - 6px)' } };
      case 'left': // Popover is left, arrow points right
        return { className: `${base} border-t border-r`, style: { right: '-6.5px', top: 'calc(50% - 6px)' } };
      case 'right': // Popover is right, arrow points left
        return { className: `${base} border-b border-l`, style: { left: '-6.5px', top: 'calc(50% - 6px)' } };
      default:
        return null;
    }
  };

  const arrow = getArrowStyle();

  const borderColor = isFallback ? 'border-amber-500/50' : 'border-gray-700';
  const shadowColor = isFallback ? 'shadow-amber-900/20' : 'shadow-2xl';

  return (
    <div
      ref={ref}
      role="dialog"
      className={`absolute pointer-events-auto w-[380px] max-w-[90vw] bg-gray-900 text-white border ${borderColor} rounded-xl ${shadowColor} p-0 overflow-visible transition-all duration-300 ease-out z-[100]`}
      style={{ 
        top: position.top, 
        left: position.left,
        transform: 'translate(0, 0)'
      }}
    >
      {/* Arrow Indicator */}
      {arrow && !isFallback && (
        <div 
          className={arrow.className} 
          style={arrow.style}
        />
      )}

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-start">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
           {isFallback && <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />}
           {step.title}
        </h3>
        <button onClick={onSkip} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {isFallback && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex gap-2 items-start">
             <span>
               No encontramos el elemento resaltado en tu pantalla. Puede estar en otra pestaña, requerir abrir un modal o no aplicar a tu vista actual.
             </span>
          </div>
        )}
        {step.allowInteraction && waitingAction && (
          <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-100 text-sm">
            Usa el elemento resaltado para seguir. Cuando la interacción abra la siguiente vista, el tour continuará solo.
          </div>
        )}
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
      <div className="px-5 py-4 bg-gray-950/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
           <span className="bg-gray-800 px-2 py-1 rounded">Paso {stepIndex + 1} / {totalSteps}</span>
           {step.allowInteraction && waitingAction && (
             <span className="text-cyan-400 flex items-center gap-1 animate-pulse">
               <MousePointerClick className="w-3 h-3" /> Interactúa para seguir
             </span>
           )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onPrev} 
            disabled={stepIndex === 0}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              if (isLast) onStop();
              else onNext();
            }}
            disabled={step.allowInteraction && waitingAction}
            className={`
              px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all
              bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:hover:bg-cyan-600
            `}
          >
            {isLast ? 'Finalizar' : 'Siguiente'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
});

TourOverlayDesktop.displayName = 'TourOverlayDesktop';
