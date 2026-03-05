import { create } from 'zustand';
import { alertsService, Alert } from '../services/alerts.service';
import { useAlertsPreferences } from './alertsPreferences.store';

interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  fetchAlerts: (businessId: number) => Promise<void>;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  loading: false,
  error: null,
  fetchAlerts: async (businessId: number) => {
    set({ loading: true, error: null });
    try {
      const prefs = useAlertsPreferences.getState().preferences;
      const alerts = await alertsService.buildAlerts(businessId, {
        lookaheadDays: prefs.recurringAheadDays,
        dueSoonDays: prefs.arDueSoonDays,
        stockThreshold: prefs.stockThreshold
      });
      set({ alerts, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      set({ error: message, loading: false });
    }
  }
}));
