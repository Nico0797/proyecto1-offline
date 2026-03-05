import { useMemo, useState, useEffect } from 'react';
import { Play, RefreshCcw, RotateCcw, GraduationCap, Award } from 'lucide-react';
import { useTourStore } from '../../tour/tourStore';
import { useTour } from '../../tour/TourProvider';
import { lintTours, TourLintResult } from '../../tour/tourLinter';
import { tourModules } from '../../tour/tourRegistry';
import { useAuthStore } from '../../store/authStore';

export const HelpTutorialsSection = () => {
  const { resetAll, resetTour, getStatus } = useTourStore();
  const { start } = useTour();
  const { user } = useAuthStore();
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [pendingReset, setPendingReset] = useState<string | null>(null);
  const status = useMemo(() => getStatus(), [getStatus]);
  const [lintResults, setLintResults] = useState<TourLintResult[]>([]);

  useEffect(() => {
    // Run Linter on mount for visibility
    setTimeout(() => {
      const results = lintTours();
      setLintResults(results);
    }, 1000);
  }, []);

  const getTourIssues = (tourId: string) => {
    return lintResults.filter(r => r.tourId === tourId && r.status === 'MISSING');
  };

  const playInitial = () => {
    start('sales.quick');
  };

  const playTour = (tourId: string) => {
    start(tourId);
  };

  const handleLinter = () => {
    lintTours();
    alert('Diagnóstico generado en consola (F12)');
  };

  const doResetAll = () => {
    if (!confirmAll) return;
    resetAll();
    setConfirmAll(false);
    setResetAllOpen(false);
    alert('Todos los tutoriales fueron reiniciados');
  };

  const doResetModule = () => {
    if (!pendingReset) return;
    // Reset the tour for the module
    const module = tourModules[pendingReset];
    if (module) {
        resetTour(module.tour.id);
    }
    setPendingReset(null);
    alert('Tutoriales del módulo reiniciados');
  };

  const badge = (s?: string) => {
    if (s === 'completed') return <span className="px-2 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400 border border-green-500/30">Completado</span>;
    if (s === 'skipped') return <span className="px-2 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Omitido</span>;
    if (s === 'in_progress') return <span className="px-2 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">En curso</span>;
    return <span className="px-2 py-0.5 text-[10px] rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">Nuevo</span>;
  };

  return (
    <div className="space-y-4" data-tour="help.section">
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-cyan-400" />
          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Tu Progreso</div>
            <div className="font-bold text-gray-900 dark:text-white text-lg">
               Centro de Aprendizaje
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {import.meta.env.DEV && (
             <button onClick={handleLinter} className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 flex items-center gap-2 font-medium text-sm transition-colors border border-amber-500/20">
                🔍 Diagnóstico
             </button>
          )}
          <button onClick={playInitial} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/20 flex items-center gap-2 font-medium text-sm transition-all active:scale-95">
            <Play className="w-4 h-4 fill-current" /> Tutorial Inicial
          </button>
          <button onClick={() => setResetAllOpen(true)} className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 font-medium text-sm transition-colors">
            <RotateCcw className="w-4 h-4" /> Reiniciar Todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.values(tourModules)
          .filter(module => !module.plan || module.plan === 'free' || (module.plan === 'pro' && user?.plan === 'pro'))
          .map((module) => {
          const tourId = module.tour.id;

          const tourStatus = status.perTour?.[tourId]?.status || 'never';
          const tourIssues = getTourIssues(tourId);

          return (
            <div key={module.id} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col hover:border-cyan-500/30 transition-colors duration-300">
              <div className="p-5 flex-1">
                 <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{module.title}</h3>
                    <button onClick={() => setPendingReset(module.id)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700/50 transition-colors" title="Reiniciar módulo">
                        <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                 </div>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">{module.description || 'Aprende a dominar este módulo.'}</p>
                 
                 <div className="space-y-3">
                    {/* Main Tour */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                <Award className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">Tutorial Completo</span>
                                <span className="text-[10px] text-gray-500 font-medium bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded w-fit mt-1">{module.tour.duration}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             {tourIssues.length > 0 && (
                                <span className="text-xs text-red-500 font-bold bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded" title={`${tourIssues.length} targets faltantes`}>
                                    ⚠️ {tourIssues.length}
                                </span>
                             )}
                            {tourStatus === 'completed' && (
                                <span className="text-green-500 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full">
                                    <GraduationCap className="w-4 h-4" />
                                </span>
                            )}
                        </div>
                    </div>
                 </div>
              </div>
              
              <div className="p-3 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button 
                    onClick={() => playTour(tourId)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                    <Play className="w-4 h-4 fill-current" />
                    {tourStatus === 'completed' ? 'Repetir Tutorial' : 'Iniciar Tutorial'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset All Modal */}
      {resetAllOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reiniciar todos los tutoriales</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Se borrará el progreso de todos los tutoriales. La bienvenida volverá a mostrarse al próximo inicio de sesión.</p>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 mb-6 cursor-pointer">
              <input type="checkbox" checked={confirmAll} onChange={(e) => setConfirmAll(e.target.checked)} className="rounded text-cyan-600 focus:ring-cyan-500" />
              Entiendo y deseo reiniciar todo
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setResetAllOpen(false); setConfirmAll(false); }} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancelar</button>
              <button onClick={doResetAll} disabled={!confirmAll} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">Reiniciar Todo</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Module Modal */}
      {pendingReset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reiniciar tutorial</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Se borrará el progreso de los tutoriales (Rápido y Experto) de este módulo. ¿Deseas continuar?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingReset(null)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancelar</button>
              <button onClick={doResetModule} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Reiniciar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
