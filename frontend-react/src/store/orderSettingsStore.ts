import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OrderColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  color?: string;
}

interface OrderSettingsState {
  columns: OrderColumnConfig[];
  toggleColumn: (id: string) => void;
  updateLabel: (id: string, label: string) => void;
  resetDefaults: () => void;
}

const defaultColumns: OrderColumnConfig[] = [
  { id: 'pending', label: 'Pendientes', visible: true, color: 'yellow' },
  { id: 'in_progress', label: 'En Preparación', visible: false, color: 'blue' },
  { id: 'completed', label: 'Completados', visible: true, color: 'green' },
  { id: 'cancelled', label: 'Cancelados', visible: true, color: 'red' },
];

export const useOrderSettings = create<OrderSettingsState>()(
  persist(
    (set) => ({
      columns: defaultColumns,
      toggleColumn: (id) =>
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, visible: !col.visible } : col
          ),
        })),
      updateLabel: (id, label) =>
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, label } : col
          ),
        })),
      resetDefaults: () => set({ columns: defaultColumns }),
    }),
    {
      name: 'order-settings-storage',
    }
  )
);
