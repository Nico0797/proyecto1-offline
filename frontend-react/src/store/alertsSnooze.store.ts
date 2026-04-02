import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AlertStatus } from '../services/alerts.service';

interface Entry {
  status: AlertStatus;
  until?: string;
}

interface SnoozeState {
  entries: Record<string, Entry>;
  setStatus: (id: string, status: AlertStatus, until?: string) => void;
  getStatus: (id: string) => Entry | undefined;
  clear: (id: string) => void;
  clearByStatus: (status: AlertStatus) => void;
  resetAll: () => void;
}

export const useAlertsSnoozeStore = create<SnoozeState>()(
  persist(
    (set, get) => ({
      entries: {},
      setStatus: (id, status, until) =>
        set({ entries: { ...get().entries, [id]: { status, until } } }),
      getStatus: (id) => get().entries[id],
      clear: (id) => {
        const e = { ...get().entries };
        delete e[id];
        set({ entries: e });
      },
      clearByStatus: (status) => {
        const nextEntries = Object.fromEntries(
          Object.entries(get().entries).filter(([, entry]) => entry.status !== status)
        );
        set({ entries: nextEntries });
      },
      resetAll: () => set({ entries: {} }),
    }),
    { name: 'alerts-snooze' }
  )
);
