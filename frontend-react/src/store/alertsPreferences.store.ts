import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AlertsPreferences {
  arOverdue: boolean;
  arDueSoon: boolean;
  arDueSoonDays: number;
  recurring: boolean;
  recurringAheadDays: number;
  stockLow: boolean;
  stockThreshold: number;
  goals: boolean;
  showSidebarCounter: boolean;
}

const defaults: AlertsPreferences = {
  arOverdue: true,
  arDueSoon: true,
  arDueSoonDays: 7,
  recurring: true,
  recurringAheadDays: 7,
  stockLow: true,
  stockThreshold: 5,
  goals: false,
  showSidebarCounter: true
};

interface PrefState {
  preferences: AlertsPreferences;
  setPreferences: (p: Partial<AlertsPreferences>) => void;
  reset: () => void;
}

export const useAlertsPreferences = create<PrefState>()(
  persist(
    (set, get) => ({
      preferences: defaults,
      setPreferences: (p) => set({ preferences: { ...get().preferences, ...p } }),
      reset: () => set({ preferences: defaults })
    }),
    { name: 'alerts-preferences' }
  )
);
