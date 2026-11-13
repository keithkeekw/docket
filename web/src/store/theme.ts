import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'docket:theme';

function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Storage can be blocked; fall through to Automatic.
  }

  return 'system';
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light';
  return mode;
}

function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const resolved = resolve(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
  document.documentElement.dataset.theme = mode;
}

const initialMode = readMode();
// Applied at import time so the first paint already has the right palette.
applyTheme(initialMode);

type ThemeStore = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: initialMode,
  setMode: (mode) => {
    applyTheme(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // A blocked localStorage only costs persistence, not the toggle.
    }
    set({ mode });
  },
}));

// Automatic follows the OS even while the app stays open.
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().mode === 'system') applyTheme('system');
  });
}
