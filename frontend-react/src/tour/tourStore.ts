import { create } from 'zustand';
import { LEARNING_CENTER_VERSION } from '../help/learningCenter';
import type { ResolvedTutorialSession } from './tutorialCatalog';
import { buildTutorialScopeKey, getPersistedTutorialScopeKey } from './tutorialScope';

export type TutorialStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed';

export type TutorialRecord = {
  tutorialId: string;
  userId: string;
  businessId: string;
  status: TutorialStatus;
  completedAt: number | null;
  dismissedAt: number | null;
  lastStartedAt: number | null;
  updatedAt: number | null;
  version: string;
};

type PersistedTutorialScope = {
  version: string;
  records: Record<string, TutorialRecord>;
};

type TourState = {
  activeTourId: string | null;
  activeSession: ResolvedTutorialSession | null;
  stepIndex: number;
  isActive: boolean;
  perTour: Record<string, TutorialRecord>;
  scopeKey: string;
  sessionId: number;
  startSession: (session: ResolvedTutorialSession, options?: { manual?: boolean }) => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  completeActiveTour: () => void;
  dismissActiveTour: () => void;
  resetTour: (tourId: string) => void;
  resetAll: () => void;
  syncScope: (scopeKey?: string) => void;
  getRecord: (tourId: string) => TutorialRecord;
  getStatus: () => { scopeKey: string; perTour: Record<string, TutorialRecord> };
};

const STORAGE_PREFIX = 'encaja:tutorial-state:';
const LEGACY_TOUR_PREFIX = 'encaja:tours:';
const LEGACY_LEARNING_PREFIX = 'encaja:learning-center:';

const normalizeIdentityValue = (value?: string | number | null, fallback = 'unknown') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
};

const parseScopeKey = (scopeKey: string) => {
  const [rawUserId = 'anon', rawBusinessId = 'nobusiness'] = String(scopeKey || '').split(':');
  return {
    userId: normalizeIdentityValue(rawUserId, 'anon'),
    businessId: normalizeIdentityValue(rawBusinessId, 'nobusiness'),
  };
};

const getDefaultRecord = (scopeKey: string, tutorialId: string): TutorialRecord => {
  const { userId, businessId } = parseScopeKey(scopeKey);
  return {
    tutorialId,
    userId,
    businessId,
    status: 'not_started',
    completedAt: null,
    dismissedAt: null,
    lastStartedAt: null,
    updatedAt: null,
    version: LEARNING_CENTER_VERSION,
  };
};

const normalizeLegacyStatus = (status?: string | null): TutorialStatus => {
  if (status === 'completed') return 'completed';
  if (status === 'skipped' || status === 'dismissed') return 'dismissed';
  if (status === 'in_progress') return 'in_progress';
  return 'not_started';
};

const normalizeRecord = (
  scopeKey: string,
  tutorialId: string,
  candidate?: Partial<TutorialRecord> | null,
): TutorialRecord => {
  const base = getDefaultRecord(scopeKey, tutorialId);
  if (!candidate) return base;

  const normalizedStatus = normalizeLegacyStatus(candidate.status);
  return {
    ...base,
    ...candidate,
    tutorialId,
    status: normalizedStatus,
    completedAt: normalizedStatus === 'completed' ? candidate.completedAt ?? candidate.updatedAt ?? Date.now() : null,
    dismissedAt: normalizedStatus === 'dismissed' ? candidate.dismissedAt ?? candidate.updatedAt ?? Date.now() : null,
    lastStartedAt: candidate.lastStartedAt ?? null,
    updatedAt: candidate.updatedAt ?? null,
    version: LEARNING_CENTER_VERSION,
  };
};

const readJsonStorage = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const migrateLegacyScope = (scopeKey: string): PersistedTutorialScope => {
  const legacyTourState = readJsonStorage<{
    status?: string;
    perTour?: Record<string, { status?: string; updatedAt?: number }>;
  }>(`${LEGACY_TOUR_PREFIX}${scopeKey}`);
  const legacyLearningState = readJsonStorage<{
    onboardingTourId?: string | null;
    onboardingStatus?: string | null;
    updatedAt?: number | null;
    lastStartedAt?: number | null;
  }>(`${LEGACY_LEARNING_PREFIX}${scopeKey}`);

  const records: Record<string, TutorialRecord> = {};

  if (legacyTourState?.perTour) {
    for (const [tutorialId, value] of Object.entries(legacyTourState.perTour)) {
      const status = normalizeLegacyStatus(value?.status);
      records[tutorialId] = normalizeRecord(scopeKey, tutorialId, {
        status,
        updatedAt: value?.updatedAt ?? null,
        completedAt: status === 'completed' ? value?.updatedAt ?? null : null,
        dismissedAt: status === 'dismissed' ? value?.updatedAt ?? null : null,
        lastStartedAt: status === 'in_progress' ? value?.updatedAt ?? null : null,
      });
    }
  }

  if (legacyLearningState?.onboardingTourId) {
    const tutorialId = legacyLearningState.onboardingTourId;
    const status = normalizeLegacyStatus(legacyLearningState.onboardingStatus);
    const migratedLearningRecord = normalizeRecord(scopeKey, tutorialId, {
      status,
      updatedAt: legacyLearningState.updatedAt ?? null,
      completedAt: status === 'completed' ? legacyLearningState.updatedAt ?? null : null,
      dismissedAt: status === 'dismissed' ? legacyLearningState.updatedAt ?? null : null,
      lastStartedAt: legacyLearningState.lastStartedAt ?? null,
    });

    const existingRecord = records[tutorialId];
    if (!existingRecord || (migratedLearningRecord.updatedAt || 0) >= (existingRecord.updatedAt || 0)) {
      records[tutorialId] = migratedLearningRecord;
    }
  }

  return {
    version: LEARNING_CENTER_VERSION,
    records,
  };
};

const loadScope = (scopeKey: string): PersistedTutorialScope => {
  const persisted = readJsonStorage<PersistedTutorialScope>(`${STORAGE_PREFIX}${scopeKey}`);
  if (persisted?.version === LEARNING_CENTER_VERSION && persisted.records) {
    const normalizedRecords = Object.fromEntries(
      Object.entries(persisted.records).map(([tutorialId, record]) => [
        tutorialId,
        normalizeRecord(scopeKey, tutorialId, record),
      ]),
    );

    return {
      version: LEARNING_CENTER_VERSION,
      records: normalizedRecords,
    };
  }

  const migrated = migrateLegacyScope(scopeKey);
  if (Object.keys(migrated.records).length > 0) {
    saveScope(scopeKey, migrated);
  }
  return migrated;
};

function saveScope(scopeKey: string, payload: PersistedTutorialScope) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${scopeKey}`, JSON.stringify(payload));
  } catch {}
}

const buildScopePayload = (scopeKey?: string) => {
  const resolvedScopeKey = scopeKey || getPersistedTutorialScopeKey();
  const current = loadScope(resolvedScopeKey);

  return {
    scopeKey: resolvedScopeKey,
    current,
    perTour: current.records || {},
  };
};

const initialScope = buildScopePayload();

const persistScopeRecords = (scopeKey: string, records: Record<string, TutorialRecord>) => {
  saveScope(scopeKey, {
    version: LEARNING_CENTER_VERSION,
    records,
  });
};

const buildUpdatedRecord = (
  scopeKey: string,
  tutorialId: string,
  status: TutorialStatus,
  previous?: TutorialRecord | null,
): TutorialRecord => {
  const current = normalizeRecord(scopeKey, tutorialId, previous);
  const timestamp = Date.now();

  return {
    ...current,
    status,
    lastStartedAt: status === 'in_progress' ? timestamp : current.lastStartedAt,
    completedAt: status === 'completed' ? timestamp : current.completedAt,
    dismissedAt: status === 'dismissed' ? timestamp : current.dismissedAt,
    updatedAt: timestamp,
    version: LEARNING_CENTER_VERSION,
  };
};

export const useTourStore = create<TourState>((set, get) => ({
  activeTourId: null,
  activeSession: null,
  stepIndex: 0,
  isActive: false,
  perTour: initialScope.perTour,
  scopeKey: initialScope.scopeKey,
  sessionId: 0,
  startSession: (session, options) => {
    const tourId = session.id;
    const { scopeKey } = get();
    const current = loadScope(scopeKey);
    const existingRecord = current.records[tourId];
    const shouldPersistProgress = options?.manual !== true || !existingRecord || existingRecord.status === 'not_started' || existingRecord.status === 'in_progress';
    const nextRecords = { ...current.records };

    if (shouldPersistProgress) {
      nextRecords[tourId] = buildUpdatedRecord(scopeKey, tourId, 'in_progress', existingRecord);
      persistScopeRecords(scopeKey, nextRecords);
    }

    set((state) => ({
      activeTourId: tourId,
      activeSession: session,
      stepIndex: 0,
      isActive: true,
      perTour: shouldPersistProgress ? nextRecords : current.records,
      sessionId: state.sessionId + 1,
    }));
  },
  stop: () => set({ isActive: false, activeTourId: null, activeSession: null, stepIndex: 0 }),
  next: () =>
    set((state) => {
      const tour = state.activeSession;
      if (!tour) return { isActive: false, activeTourId: null, activeSession: null, stepIndex: 0 };

      const nextIndex = state.stepIndex + 1;
      if (nextIndex >= tour.steps.length) {
        const scopeKey = get().scopeKey;
        const current = loadScope(scopeKey);
        const nextRecords = {
          ...current.records,
          [state.activeTourId!]: buildUpdatedRecord(scopeKey, state.activeTourId!, 'completed', current.records[state.activeTourId!]),
        };
        persistScopeRecords(scopeKey, nextRecords);
        return {
          isActive: false,
          activeTourId: null,
          activeSession: null,
          stepIndex: 0,
          perTour: nextRecords,
        };
      }
      return { stepIndex: nextIndex };
    }),
  prev: () => set((state) => ({ stepIndex: Math.max(0, state.stepIndex - 1) })),
  completeActiveTour: () => {
    const { activeTourId, scopeKey } = get();
    if (!activeTourId) return;

    const current = loadScope(scopeKey);
    const nextRecords = {
      ...current.records,
      [activeTourId]: buildUpdatedRecord(scopeKey, activeTourId, 'completed', current.records[activeTourId]),
    };
    persistScopeRecords(scopeKey, nextRecords);
    set({ perTour: nextRecords, isActive: false, activeTourId: null, activeSession: null, stepIndex: 0 });
  },
  dismissActiveTour: () => {
    const { activeTourId, scopeKey } = get();
    if (!activeTourId) {
      set({ isActive: false, activeTourId: null, activeSession: null, stepIndex: 0 });
      return;
    }

    const current = loadScope(scopeKey);
    const nextRecords = {
      ...current.records,
      [activeTourId]: buildUpdatedRecord(scopeKey, activeTourId, 'dismissed', current.records[activeTourId]),
    };
    persistScopeRecords(scopeKey, nextRecords);
    set({ perTour: nextRecords, isActive: false, activeTourId: null, activeSession: null, stepIndex: 0 });
  },
  resetTour: (tourId) => {
    const { scopeKey } = get();
    const current = loadScope(scopeKey);
    const nextRecords = { ...current.records };
    delete nextRecords[tourId];
    persistScopeRecords(scopeKey, nextRecords);
    set({ perTour: nextRecords });
  },
  resetAll: () => {
    const { scopeKey } = get();
    persistScopeRecords(scopeKey, {});
    set({ perTour: {}, isActive: false, activeTourId: null, activeSession: null, stepIndex: 0 });
  },
  syncScope: (scopeKey) => {
    const nextScope = buildScopePayload(scopeKey);
    const currentScopeKey = get().scopeKey;

    if (currentScopeKey === nextScope.scopeKey) {
      set(() => ({
        perTour: nextScope.perTour,
      }));
      return;
    }

    set({
      scopeKey: nextScope.scopeKey,
      perTour: nextScope.perTour,
      isActive: false,
      activeTourId: null,
      activeSession: null,
      stepIndex: 0,
    });
  },
  getRecord: (tourId) => {
    const { scopeKey, perTour } = get();
    return perTour[tourId] || getDefaultRecord(scopeKey, tourId);
  },
  getStatus: () => {
    const { scopeKey } = get();
    const current = loadScope(scopeKey);
    return {
      scopeKey,
      perTour: current.records,
    };
  },
}));

export const buildTourScopeKey = (
  userId?: number | string | null,
  businessId?: number | string | null,
) => buildTutorialScopeKey(userId, businessId);
