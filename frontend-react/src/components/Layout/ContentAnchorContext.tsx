import React, { createContext, useContext, useRef, useCallback, useState } from 'react';

export type RemeasureTrigger = () => void;

type ContentAnchorContextType = {
  /** Ref al elemento anchor de la página activa */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Registra el ref del anchor desde la página activa */
  setAnchorRef: (ref: React.RefObject<HTMLElement | null>) => void;
  clearAnchorRef: (node: HTMLElement | null) => void;
  /** Fuerza re-medición del contentStart (para usar desde páginas hijas) */
  triggerRemeasure: RemeasureTrigger | null;
  /** Registra la función de trigger desde MainLayout */
  setTriggerRemeasure: (fn: RemeasureTrigger) => void;
};

const ContentAnchorContext = createContext<ContentAnchorContextType | null>(null);

export const ContentAnchorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const anchorRef = useRef<HTMLElement | null>(null);
  const [triggerRemeasure, setTriggerRemeasureState] = useState<RemeasureTrigger | null>(null);

  const setAnchorRef = useCallback((ref: React.RefObject<HTMLElement | null>) => {
    anchorRef.current = ref.current;
  }, []);

  const clearAnchorRef = useCallback((node: HTMLElement | null) => {
    if (!node || anchorRef.current === node) {
      anchorRef.current = null;
    }
  }, []);

  const setTriggerRemeasure = useCallback((fn: RemeasureTrigger) => {
    setTriggerRemeasureState(() => fn);
  }, []);

  return (
    <ContentAnchorContext.Provider
      value={{
        anchorRef,
        setAnchorRef,
        clearAnchorRef,
        triggerRemeasure,
        setTriggerRemeasure,
      }}
    >
      {children}
    </ContentAnchorContext.Provider>
  );
};

export const useContentAnchor = () => {
  const context = useContext(ContentAnchorContext);
  if (!context) {
    throw new Error('useContentAnchor must be used within ContentAnchorProvider');
  }
  return context;
};

/** Hook para páginas que necesitan forzar re-medición (tabs, filtros, etc.) */
export const useTriggerRemeasure = () => {
  const { triggerRemeasure } = useContentAnchor();
  return triggerRemeasure || (() => {});
};
