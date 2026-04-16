import { create } from 'zustand';
import type { ElementType } from 'react';

export interface ContextualFloatingActionConfig {
  ownerKey: string;
  title: string;
  label: string;
  icon?: ElementType;
  onClick: () => void;
}

interface ContextualFloatingActionState {
  action: ContextualFloatingActionConfig | null;
  headerVisible: boolean;
  debugForceVisible: boolean;
  registerAction: (action: ContextualFloatingActionConfig) => void;
  unregisterAction: (ownerKey: string) => void;
  setHeaderVisible: (ownerKey: string, isVisible: boolean) => void;
  setDebugForceVisible: (forceVisible: boolean) => void;
}

export const useContextualFloatingActionStore = create<ContextualFloatingActionState>((set, get) => ({
  action: null,
  headerVisible: true,
  debugForceVisible: false,
  registerAction: (action) =>
    set((state) => ({
      action,
      headerVisible: state.action?.ownerKey === action.ownerKey ? state.headerVisible : true,
    })),
  unregisterAction: (ownerKey) =>
    set((state) => (state.action?.ownerKey === ownerKey ? { action: null, headerVisible: true } : state)),
  setHeaderVisible: (ownerKey, isVisible) => {
    if (get().action?.ownerKey !== ownerKey) return;
    set({ headerVisible: isVisible });
  },
  setDebugForceVisible: (forceVisible) => set({ debugForceVisible: forceVisible }),
}));
