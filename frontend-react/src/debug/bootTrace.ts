import { useEffect, useState } from 'react';

export type BootTraceEntry = {
  id: number;
  at: string;
  label: string;
  data?: Record<string, unknown>;
};

const BOOT_TRACE_EVENT = 'encaja:boot-trace';
const MAX_BOOT_TRACE_ENTRIES = 120;

declare global {
  interface Window {
    __ENCAJA_BOOT_TRACE__?: BootTraceEntry[];
  }
}

const getStorage = () => {
  if (typeof window === 'undefined') return [] as BootTraceEntry[];
  if (!Array.isArray(window.__ENCAJA_BOOT_TRACE__)) {
    window.__ENCAJA_BOOT_TRACE__ = [];
  }
  return window.__ENCAJA_BOOT_TRACE__;
};

export const pushBootTrace = (label: string, data?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;

  const entry: BootTraceEntry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    at: new Date().toISOString(),
    label,
    data,
  };

  const nextEntries = [...getStorage(), entry].slice(-MAX_BOOT_TRACE_ENTRIES);
  window.__ENCAJA_BOOT_TRACE__ = nextEntries;
  window.dispatchEvent(new CustomEvent(BOOT_TRACE_EVENT, { detail: entry }));
  console.info('[boot-trace]', label, data || {});
};

export const getBootTraceEntries = () => {
  return [...getStorage()];
};

export const clearBootTraceEntries = () => {
  if (typeof window === 'undefined') return;
  window.__ENCAJA_BOOT_TRACE__ = [];
  window.dispatchEvent(new CustomEvent(BOOT_TRACE_EVENT));
};

export const useBootTraceEntries = (limit = 14) => {
  const [entries, setEntries] = useState<BootTraceEntry[]>(() => getBootTraceEntries().slice(-limit));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateEntries = () => {
      setEntries(getBootTraceEntries().slice(-limit));
    };

    updateEntries();
    window.addEventListener(BOOT_TRACE_EVENT, updateEntries);
    return () => {
      window.removeEventListener(BOOT_TRACE_EVENT, updateEntries);
    };
  }, [limit]);

  return entries;
};
