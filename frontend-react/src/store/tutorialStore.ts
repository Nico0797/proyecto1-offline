import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GlobalStatus = 'never_started' | 'in_progress' | 'completed' | 'skipped';
type ModuleStatus = 'new' | 'in_progress' | 'completed' | 'skipped';

export interface TutorialState {
  hasSeenWelcome: boolean;
  completedModules: string[];
  skippedModules: string[];
  activeModule: string | null;
  currentStep: number;
  isTutorialActive: boolean;
  lastSeen: Record<string, number>;
  sessionId: number;
  setHasSeenWelcome: (seen: boolean) => void;
  startTutorial: (moduleId: string) => void;
  startOnboarding: () => void;
  stopTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completeModule: (moduleId: string) => void;
  skipModule: (moduleId: string) => void;
  resetAll: () => void;
  resetModule: (moduleId: string) => void;
  getStatus: () => {
    status: GlobalStatus;
    perModule: Record<string, { status: ModuleStatus; updatedAt?: number }>;
  };
}

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

function loadUserOnboarding(userKey: string) {
  try {
    const raw = localStorage.getItem(`encaja:onboarding:${userKey}`);
    if (!raw) return { status: 'never_started', perModule: {} } as any;
    return JSON.parse(raw);
  } catch {
    return { status: 'never_started', perModule: {} } as any;
  }
}

function saveUserOnboarding(userKey: string, data: any) {
  try {
    localStorage.setItem(`encaja:onboarding:${userKey}`, JSON.stringify(data));
  } catch {}
}

function clearUserOnboarding(userKey: string) {
  try {
    localStorage.removeItem(`encaja:onboarding:${userKey}`);
  } catch {}
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      hasSeenWelcome: false,
      completedModules: [],
      skippedModules: [],
      activeModule: null,
      currentStep: 0,
      isTutorialActive: false,
      lastSeen: {},
      sessionId: 0,

      setHasSeenWelcome: (seen) => {
        set({ hasSeenWelcome: seen });
        const userKey = getUserKey();
        const data = loadUserOnboarding(userKey);
        const status: GlobalStatus = seen ? (get().isTutorialActive ? 'in_progress' : 'completed') : 'never_started';
        saveUserOnboarding(userKey, { ...data, status });
      },

      startTutorial: (moduleId) => {
        // Garantizar exclusividad: detener sesión previa y abrir una nueva
        set((state) => ({
          activeModule: moduleId,
          currentStep: 0,
          isTutorialActive: true,
          sessionId: state.sessionId + 1
        }));
        const userKey = getUserKey();
        const data = loadUserOnboarding(userKey);
        const perModule = { ...(data.perModule || {}), [moduleId]: { status: 'in_progress', updatedAt: Date.now() } };
        saveUserOnboarding(userKey, { ...data, status: 'in_progress', perModule });
      },

      startOnboarding: () => {
        // Por ahora, onboarding = dashboard
        get().startTutorial('dashboard');
      },

      stopTutorial: () => set({ isTutorialActive: false, activeModule: null, currentStep: 0 }),

      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),

      prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

      completeModule: (moduleId) => {
        set((state) => ({
          completedModules: [...new Set([...state.completedModules, moduleId])],
          isTutorialActive: false,
          activeModule: null,
          currentStep: 0,
          lastSeen: { ...state.lastSeen, [moduleId]: Date.now() }
        }));
        const userKey = getUserKey();
        const data = loadUserOnboarding(userKey);
        const perModule = { ...(data.perModule || {}), [moduleId]: { status: 'completed', updatedAt: Date.now() } };
        saveUserOnboarding(userKey, { ...data, status: 'completed', perModule });
      },

      skipModule: (moduleId) => {
        set((state) => ({
          skippedModules: [...new Set([...state.skippedModules, moduleId])],
          isTutorialActive: false,
          activeModule: null,
          currentStep: 0,
          lastSeen: { ...state.lastSeen, [moduleId]: Date.now() }
        }));
        const userKey = getUserKey();
        const data = loadUserOnboarding(userKey);
        const perModule = { ...(data.perModule || {}), [moduleId]: { status: 'skipped', updatedAt: Date.now() } };
        saveUserOnboarding(userKey, { ...data, status: 'skipped', perModule });
      },

      resetAll: () => {
        set({
          hasSeenWelcome: false,
          completedModules: [],
          skippedModules: [],
          activeModule: null,
          currentStep: 0,
          isTutorialActive: false,
          lastSeen: {}
        });
        const userKey = getUserKey();
        clearUserOnboarding(userKey);
      },

      resetModule: (moduleId) => {
        set((state) => ({
          completedModules: state.completedModules.filter((m) => m !== moduleId),
          skippedModules: state.skippedModules.filter((m) => m !== moduleId),
          lastSeen: Object.fromEntries(Object.entries(state.lastSeen).filter(([k]) => k !== moduleId))
        }));
        const userKey = getUserKey();
        const data = loadUserOnboarding(userKey);
        const per = { ...(data.perModule || {}) };
        delete per[moduleId];
        saveUserOnboarding(userKey, { ...data, perModule: per });
      },

      getStatus: () => {
        const userKey = getUserKey();
        const data = loadUserOnboarding(userKey);
        return {
          status: (data.status as GlobalStatus) || 'never_started',
          perModule: data.perModule || {}
        };
      }
    }),
    {
      name: 'encaja-tutorial-storage'
    }
  )
);
