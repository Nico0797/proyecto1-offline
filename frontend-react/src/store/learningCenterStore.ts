import { create } from 'zustand';
import { LEARNING_CENTER_VERSION } from '../help/learningCenter';
import { buildTutorialScopeKey } from '../tour/tutorialScope';

export type OnboardingLifecycleStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed';

type LearningCenterRecord = {
  version: string;
  onboardingTourId: string | null;
  onboardingStatus: OnboardingLifecycleStatus;
  updatedAt: number | null;
  lastStartedAt: number | null;
};

type LearningCenterState = {
  records: Record<string, LearningCenterRecord>;
  getRecord: (scopeKey: string, onboardingTourId: string) => LearningCenterRecord;
  markOnboardingStarted: (scopeKey: string, onboardingTourId: string) => void;
  markOnboardingCompleted: (scopeKey: string, onboardingTourId: string) => void;
  markOnboardingDismissed: (scopeKey: string, onboardingTourId: string) => void;
  resetOnboarding: (scopeKey: string, onboardingTourId: string) => void;
};

const STORAGE_PREFIX = 'encaja:learning-center:';

const getDefaultRecord = (onboardingTourId: string): LearningCenterRecord => ({
  version: LEARNING_CENTER_VERSION,
  onboardingTourId,
  onboardingStatus: 'not_started',
  updatedAt: null,
  lastStartedAt: null,
});

const loadRecord = (scopeKey: string, onboardingTourId: string): LearningCenterRecord => {
  if (typeof window === 'undefined') {
    return getDefaultRecord(onboardingTourId);
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${scopeKey}`);
    if (!raw) return getDefaultRecord(onboardingTourId);

    const parsed = JSON.parse(raw) as Partial<LearningCenterRecord>;
    if (parsed.version !== LEARNING_CENTER_VERSION) {
      return getDefaultRecord(onboardingTourId);
    }

    const parsedStatus = parsed.onboardingStatus as OnboardingLifecycleStatus | 'pending' | undefined;
    const persistedStatus =
      parsedStatus === 'pending' || !parsedStatus
        ? 'not_started'
        : parsedStatus;

    return {
      version: LEARNING_CENTER_VERSION,
      onboardingTourId: parsed.onboardingTourId || onboardingTourId,
      onboardingStatus: persistedStatus,
      updatedAt: parsed.updatedAt || null,
      lastStartedAt: parsed.lastStartedAt || null,
    };
  } catch {
    return getDefaultRecord(onboardingTourId);
  }
};

const saveRecord = (scopeKey: string, record: LearningCenterRecord) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${scopeKey}`, JSON.stringify(record));
  } catch {}
};

export const buildLearningScopeKey = (userId?: number | string | null, businessId?: number | string | null) => {
  return buildTutorialScopeKey(userId, businessId);
};

export const useLearningCenterStore = create<LearningCenterState>((set, get) => ({
  records: {},
  getRecord: (scopeKey, onboardingTourId) => {
    const existing = get().records[scopeKey];
    if (existing && existing.version === LEARNING_CENTER_VERSION && existing.onboardingTourId === onboardingTourId) {
      return existing;
    }

    const next = loadRecord(scopeKey, onboardingTourId);
    set((state) => ({
      records: {
        ...state.records,
        [scopeKey]: next,
      },
    }));
    return next;
  },
  markOnboardingStarted: (scopeKey, onboardingTourId) => {
    const next: LearningCenterRecord = {
      ...get().getRecord(scopeKey, onboardingTourId),
      version: LEARNING_CENTER_VERSION,
      onboardingTourId,
      onboardingStatus: 'in_progress',
      lastStartedAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveRecord(scopeKey, next);
    set((state) => ({ records: { ...state.records, [scopeKey]: next } }));
  },
  markOnboardingCompleted: (scopeKey, onboardingTourId) => {
    const next: LearningCenterRecord = {
      ...get().getRecord(scopeKey, onboardingTourId),
      version: LEARNING_CENTER_VERSION,
      onboardingTourId,
      onboardingStatus: 'completed',
      updatedAt: Date.now(),
    };

    saveRecord(scopeKey, next);
    set((state) => ({ records: { ...state.records, [scopeKey]: next } }));
  },
  markOnboardingDismissed: (scopeKey, onboardingTourId) => {
    const next: LearningCenterRecord = {
      ...get().getRecord(scopeKey, onboardingTourId),
      version: LEARNING_CENTER_VERSION,
      onboardingTourId,
      onboardingStatus: 'dismissed',
      updatedAt: Date.now(),
    };

    saveRecord(scopeKey, next);
    set((state) => ({ records: { ...state.records, [scopeKey]: next } }));
  },
  resetOnboarding: (scopeKey, onboardingTourId) => {
    const next = getDefaultRecord(onboardingTourId);
    saveRecord(scopeKey, next);
    set((state) => ({ records: { ...state.records, [scopeKey]: next } }));
  },
}));
