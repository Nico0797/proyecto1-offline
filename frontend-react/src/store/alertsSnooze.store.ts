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
      }
    }),
    { name: 'alerts-snooze' }
  )
);
