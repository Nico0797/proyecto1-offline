import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark', // Default to dark as per current design
      toggleTheme: () => set({ theme: 'dark' }), // Always enforce dark
      setTheme: () => set({ theme: 'dark' }), // Always enforce dark
    }),
    {
      name: 'theme-storage',
    }
  )
);
