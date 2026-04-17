import { useMemo } from 'react';

const DEBUG_QUERY_PARAM = 'debug';
const DEBUG_GLOBAL_STORAGE_KEY = 'encaja.debug.ui';
const DEBUG_STORAGE_PREFIX = 'encaja.debug.';

const normalizeDebugToken = (value: string) => value.trim().toLowerCase();

const collectQueryTokens = (search: string) => {
  const params = new URLSearchParams(search);
  const raw = params.get(DEBUG_QUERY_PARAM);
  if (!raw) return new Set<string>();

  return new Set(
    raw
      .split(',')
      .map(normalizeDebugToken)
      .filter(Boolean),
  );
};

export const isDebugFlagEnabled = (flag: string) => {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;

  const normalizedFlag = normalizeDebugToken(flag);
  const queryTokens = collectQueryTokens(window.location.search);
  const globalStorage = window.localStorage.getItem(DEBUG_GLOBAL_STORAGE_KEY) === '1';
  const specificStorage = window.localStorage.getItem(`${DEBUG_STORAGE_PREFIX}${normalizedFlag}`) === '1';

  return (
    globalStorage ||
    specificStorage ||
    queryTokens.has('1') ||
    queryTokens.has('all') ||
    queryTokens.has(normalizedFlag)
  );
};

export const useDebugFlag = (flag: string) =>
  useMemo(() => isDebugFlagEnabled(flag), [flag]);
