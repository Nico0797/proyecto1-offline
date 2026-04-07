import { create } from 'zustand';

type HelpPrefsState = {
  favorites: string[]; // tip ids
  lastTipIndex: number;
  toggleFavorite: (id: string) => void;
  nextTip: (max: number) => void;
  getUserKey: () => string;
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

function loadPrefs(key: string) {
  try {
    const raw = localStorage.getItem(`encaja:help:${key}`);
    return raw ? JSON.parse(raw) : { favorites: [], lastTipIndex: 0 };
  } catch {
    return { favorites: [], lastTipIndex: 0 };
  }
}

function savePrefs(key: string, data: any) {
  try {
    localStorage.setItem(`encaja:help:${key}`, JSON.stringify(data));
  } catch {}
}

export const useHelpPrefs = create<HelpPrefsState>((set) => ({
  favorites: loadPrefs(getUserKey()).favorites,
  lastTipIndex: loadPrefs(getUserKey()).lastTipIndex,
  toggleFavorite: (id: string) => {
    const key = getUserKey();
    const current = loadPrefs(key);
    const favorites: string[] = current.favorites.includes(id)
      ? current.favorites.filter((x: string) => x !== id)
      : [...current.favorites, id];
    savePrefs(key, { ...current, favorites });
    set({ favorites });
  },
  nextTip: (max: number) => {
    const key = getUserKey();
    const current = loadPrefs(key);
    const next = (current.lastTipIndex + 1) % max;
    savePrefs(key, { ...current, lastTipIndex: next });
    set({ lastTipIndex: next });
  },
  getUserKey
}));
