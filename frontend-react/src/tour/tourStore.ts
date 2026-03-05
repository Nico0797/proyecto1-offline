import { create } from 'zustand';
import { tours } from './tourRegistry';

export type TourStatus = 'never' | 'in_progress' | 'completed' | 'skipped';

type PerTour = Record<string, { status: TourStatus; updatedAt?: number }>;

type TourState = {
  activeTourId: string | null;
  stepIndex: number;
  isActive: boolean;
  perTour: PerTour;
  sessionId: number;
  start: (tourId: string) => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  resetTour: (tourId: string) => void;
  resetAll: () => void;
  markSkipped: (tourId: string) => void;
  getStatus: () => { status: TourStatus; perTour: PerTour };
};

function getUserKey() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'anon';
    const u = JSON.parse(raw);
    return String(u?.id || u?.email || 'anon');
  } catch {
    return 'anon';
  }
}

function load(key: string) {
  try {
    const raw = localStorage.getItem(`encaja:tours:${key}`);
    return raw ? JSON.parse(raw) : { status: 'never', perTour: {} as PerTour };
  } catch {
    return { status: 'never', perTour: {} as PerTour };
  }
}

function save(key: string, data: any) {
  try {
    localStorage.setItem(`encaja:tours:${key}`, JSON.stringify(data));
  } catch {}
}

export const useTourStore = create<TourState>((set) => ({
  activeTourId: null,
  stepIndex: 0,
  isActive: false,
  perTour: load(getUserKey()).perTour,
  sessionId: 0,
  start: (tourId: string) => {
    const key = getUserKey();
    const cur = load(key);
    const perTour = { ...(cur.perTour || {}), [tourId]: { status: 'in_progress', updatedAt: Date.now() } };
    save(key, { ...cur, status: 'in_progress', perTour });
    set((s) => ({ activeTourId: tourId, stepIndex: 0, isActive: true, perTour, sessionId: s.sessionId + 1 }));
  },
  stop: () => set({ isActive: false, activeTourId: null, stepIndex: 0 }),
  next: () => set((s) => {
    const tour = s.activeTourId ? tours[s.activeTourId] : null;
    if (!tour) return { isActive: false, activeTourId: null, stepIndex: 0 };
    
    const nextIndex = s.stepIndex + 1;
    if (nextIndex >= tour.steps.length) {
      // Tour complete - mark as completed
      const key = getUserKey();
      const cur = load(key);
      const perTour = { ...(cur.perTour || {}), [s.activeTourId!]: { status: 'completed', updatedAt: Date.now() } };
      save(key, { ...cur, status: 'completed', perTour });
      return { isActive: false, activeTourId: null, stepIndex: 0, perTour };
    }
    return { stepIndex: nextIndex };
  }),
  prev: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
  resetTour: (tourId: string) => {
    const key = getUserKey();
    const cur = load(key);
    const perTour = { ...(cur.perTour || {}) };
    delete perTour[tourId];
    save(key, { ...cur, perTour });
    set({ perTour });
  },
  resetAll: () => {
    const key = getUserKey();
    save(key, { status: 'never', perTour: {} });
    set({ perTour: {}, isActive: false, activeTourId: null, stepIndex: 0 });
  },
  markSkipped: (tourId: string) => {
    const key = getUserKey();
    const cur = load(key);
    const perTour = { ...(cur.perTour || {}), [tourId]: { status: 'skipped', updatedAt: Date.now() } };
    save(key, { ...cur, status: 'skipped', perTour });
    set({ perTour, isActive: false, activeTourId: null, stepIndex: 0 });
  },
  getStatus: () => {
    const key = getUserKey();
    const cur = load(key);
    return { status: (cur.status as TourStatus) || 'never', perTour: cur.perTour || {} };
  }
}));
