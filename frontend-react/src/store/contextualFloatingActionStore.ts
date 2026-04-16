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
  registerAction: (action: ContextualFloatingActionConfig) => void;
  unregisterAction: (ownerKey: string) => void;
}

export const useContextualFloatingActionStore = create<ContextualFloatingActionState>((set) => ({
  action: null,
  registerAction: (action) => set({ action }),
  unregisterAction: (ownerKey) =>
    set((state) => (state.action?.ownerKey === ownerKey ? { action: null } : state)),
}));
