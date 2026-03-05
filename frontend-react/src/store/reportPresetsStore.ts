import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ReportPreset {
  id: string;
  name: string;
  tab: string;
  filters: {
    period: string;
    startDate: string;
    endDate: string;
    comparePeriod: boolean;
    [key: string]: any;
  };
  visibleColumns?: string[];
}

interface ReportPresetsState {
  presets: ReportPreset[];
  savePreset: (preset: Omit<ReportPreset, 'id'>) => void;
  deletePreset: (id: string) => void;
  loadPreset: (id: string) => ReportPreset | undefined;
}

export const useReportPresetsStore = create<ReportPresetsState>()(
  persist(
    (set, get) => ({
      presets: [],
      savePreset: (preset) => {
        const newPreset = { ...preset, id: crypto.randomUUID() };
        set((state) => ({ presets: [...state.presets, newPreset] }));
      },
      deletePreset: (id) => {
        set((state) => ({ presets: state.presets.filter(p => p.id !== id) }));
      },
      loadPreset: (id) => {
        return get().presets.find(p => p.id === id);
      }
    }),
    {
      name: 'report-presets-storage',
    }
  )
);
