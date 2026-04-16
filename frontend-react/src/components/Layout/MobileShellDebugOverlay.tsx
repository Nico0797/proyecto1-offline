import React, { useRef, useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useBusinessStore } from '../../store/businessStore';
import { useContextualFloatingActionStore } from '../../store/contextualFloatingActionStore';
import { buildInfo } from '../../generated/buildInfo';

type MobileShellDebugOverlayProps = {
  scrollTop: number;
  localBusinessesCount: number;
  offlineMode: boolean;
  onExportBackup: () => Promise<void>;
  onImportBackup: (file: File) => Promise<void>;
};

export const MobileShellDebugOverlay: React.FC<MobileShellDebugOverlayProps> = ({
  scrollTop,
  localBusinessesCount,
  offlineMode,
  onExportBackup,
  onImportBackup,
}) => {
  const location = useLocation();
  const { activeBusiness, businesses } = useBusinessStore();
  const action = useContextualFloatingActionStore((state) => state.action);
  const headerVisible = useContextualFloatingActionStore((state) => state.headerVisible);
  const debugForceVisible = useContextualFloatingActionStore((state) => state.debugForceVisible);
  const setDebugForceVisible = useContextualFloatingActionStore((state) => state.setDebugForceVisible);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fabVisible = Boolean(action) && (debugForceVisible || !headerVisible);

  const handleExport = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await onExportBackup();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No fue posible exportar el respaldo.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async (file?: File | null) => {
    if (!file) return;
    setIsBusy(true);
    setError(null);
    try {
      await onImportBackup(file);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'No fue posible restaurar el respaldo.');
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--app-mobile-bottom-nav-height)+var(--app-mobile-bottom-nav-overhang)+0.9rem+var(--app-safe-area-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-[57] lg:hidden">
      <div className="pointer-events-auto flex max-w-[min(92vw,23rem)] flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-2 self-start rounded-full border border-black/8 bg-black/78 px-3 py-2 text-[11px] font-semibold tracking-[0.02em] text-white shadow-[0_16px_26px_-22px_rgba(15,23,42,0.6)] backdrop-blur-sm"
        >
          <Bug className="h-3.5 w-3.5" />
          <span>{buildInfo.gitCommitShort}</span>
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        {isExpanded ? (
          <div className="rounded-2xl border border-black/8 bg-black/82 p-3 text-[11px] leading-4 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.66)] backdrop-blur-md">
            <div>ruta: {location.pathname}{location.search}</div>
            <div>scrollTop: {Math.round(scrollTop)}</div>
            <div>offline: {offlineMode ? 'si' : 'no'}</div>
            <div>activeBusiness: {activeBusiness?.id ?? 'none'}</div>
            <div>businesses store/local: {businesses.length} / {localBusinessesCount}</div>
            <div>fab action: {action ? 'si' : 'no'}</div>
            <div>fab label: {action?.label ?? 'none'}</div>
            <div>fab visible: {fabVisible ? 'si' : 'no'}</div>
            <div>headerVisible: {headerVisible ? 'si' : 'no'}</div>
            <div>forceFab: {debugForceVisible ? 'si' : 'no'}</div>
            <div>build: {buildInfo.gitCommitShort} · {buildInfo.builtAtDisplay}</div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDebugForceVisible(!debugForceVisible)}
                className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1.5 font-medium"
              >
                {debugForceVisible ? 'Desactivar FAB forzado' : 'Forzar FAB'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1.5 font-medium disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar backup
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1.5 font-medium disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Importar backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => handleImport(event.target.files?.[0])}
              />
            </div>

            {error ? <div className="mt-2 text-[10px] text-amber-200">{error}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
