import React, { useEffect, useRef, useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useBusinessStore } from '../../store/businessStore';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollContainers, setScrollContainers] = useState<string[]>([]);
  const [topChromeHeights, setTopChromeHeights] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // FASE 1B: FAB contextual completamente desactivado
  const fabStatus = 'DESACTIVADO (FASE 1)';

  // Detectar contenedores con scroll + medir alturas del top chrome
  useEffect(() => {
    const detectMetrics = () => {
      // 1. Contenedores con scroll
      const containers: Array<{
        name: string;
        overflowY: string;
        scrollTop: number;
        clientHeight: number;
        scrollHeight: number;
      }> = [];
      const allElements = document.querySelectorAll('*');
      allElements.forEach((el, index) => {
        if (index > 300) return;
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          const htmlEl = el as HTMLElement;
          const id = htmlEl.id || '';
          const className = htmlEl.className?.toString().split(' ')[0] || '';
          const tag = htmlEl.tagName.toLowerCase();
          const name = `${tag}${id ? '#' + id : ''}${className ? '.' + className : ''}`;
          containers.push({
            name,
            overflowY,
            scrollTop: htmlEl.scrollTop,
            clientHeight: htmlEl.clientHeight,
            scrollHeight: htmlEl.scrollHeight,
          });
        }
      });
      containers.sort((a, b) => b.scrollTop - a.scrollTop);
      setScrollContainers(containers.slice(0, 5).map(c =>
        `${c.name} | ${c.overflowY} | scrollTop:${Math.round(c.scrollTop)} | h:${c.clientHeight}/${c.scrollHeight}`
      ));

      // 2. Medir alturas del top chrome
      const chromeSelectors = [
        { selector: '.app-mobile-topbar', name: 'MobileTopBar' },
        { selector: '.app-page-header', name: 'PageHeader' },
        { selector: '.app-filter-strip', name: 'PageFilters' },
        { selector: '[data-swipe-nav]', name: 'SwipePagerNav' },
        { selector: '.app-mobile-utility-bar', name: 'MobileUtilityBar' },
      ];
      const heights: string[] = [];
      let totalHeight = 0;
      chromeSelectors.forEach(({ selector, name }) => {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) {
          const h = el.getBoundingClientRect().height;
          totalHeight += h;
          heights.push(`${name}: ${Math.round(h)}px`);
        }
      });
      heights.push(`TOTAL: ${Math.round(totalHeight)}px`);
      setTopChromeHeights(heights);
    };

    detectMetrics();
    const interval = setInterval(detectMetrics, 1500);
    return () => clearInterval(interval);
  }, [location.pathname, scrollTop]);

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
            <div>scrollTop root: {Math.round(scrollTop)}</div>
            <div className="text-amber-300">FAB: {fabStatus}</div>
            <div>offline: {offlineMode ? 'si' : 'no'}</div>
            <div>activeBusiness: {activeBusiness?.id ?? 'none'}</div>
            <div>businesses store/local: {businesses.length} / {localBusinessesCount}</div>
            <div>build: {buildInfo.gitCommitShort} · {buildInfo.builtAtDisplay}</div>
            {topChromeHeights.length > 0 && (
              <div className="mt-1 border-t border-white/10 pt-1">
                <div className="text-[10px] text-white/60">top chrome heights:</div>
                {topChromeHeights.map((h, i) => (
                  <div key={i} className={`text-[10px] ${h.includes('TOTAL') ? 'text-amber-300 font-medium' : 'text-white/80'}`}>{h}</div>
                ))}
              </div>
            )}
            {scrollContainers.length > 0 && (
              <div className="mt-1 border-t border-white/10 pt-1">
                <div className="text-[10px] text-white/60">scroll containers:</div>
                {scrollContainers.map((c, i) => (
                  <div key={i} className="truncate text-[10px] text-white/80">{c}</div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
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
