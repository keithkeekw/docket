import { create } from 'zustand';

export type KeyBinding = {
  id: string;
  label: string;
  description: string;
  binding: string;
  defaultBinding: string;
  configurable: boolean;
};

const STORAGE_KEY = 'docket:keybindings';

const DEFAULT_BINDINGS: Record<string, string> = {
  quickCapture: 'mod+k',
  aiCapture: 'mod+enter',
};

function loadBindings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BINDINGS;
    return { ...DEFAULT_BINDINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BINDINGS;
  }
}

function saveBindings(bindings: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // ignore storage errors
  }
}

type KeybindingsStore = {
  bindings: Record<string, string>;
  setBinding: (id: string, binding: string) => void;
  resetBinding: (id: string) => void;
  resetAll: () => void;
};

export const useKeybindingsStore = create<KeybindingsStore>((set, get) => ({
  bindings: loadBindings(),
  setBinding: (id, binding) => {
    const next = { ...get().bindings, [id]: binding };
    saveBindings(next);
    set({ bindings: next });
  },
  resetBinding: (id) => {
    const next = { ...get().bindings, [id]: DEFAULT_BINDINGS[id] ?? '' };
    saveBindings(next);
    set({ bindings: next });
  },
  resetAll: () => {
    saveBindings(DEFAULT_BINDINGS);
    set({ bindings: { ...DEFAULT_BINDINGS } });
  },
}));

/** All keyboard shortcuts in the app, in display order. */
export const ALL_SHORTCUTS: KeyBinding[] = [
  {
    id: 'quickCapture',
    label: 'Quick capture',
    description: 'Open the capture dialog from anywhere',
    binding: 'mod+k',
    defaultBinding: 'mod+k',
    configurable: true,
  },
  {
    id: 'aiCapture',
    label: 'AI capture',
    description: 'Parse the capture text with AI',
    binding: 'mod+enter',
    defaultBinding: 'mod+enter',
    configurable: true,
  },
  {
    id: 'saveCapture',
    label: 'Save capture',
    description: 'Save the task directly from the capture dialog',
    binding: 'enter',
    defaultBinding: 'enter',
    configurable: false,
  },
  {
    id: 'closeDialog',
    label: 'Close dialog',
    description: 'Dismiss the active dialog or modal',
    binding: 'escape',
    defaultBinding: 'escape',
    configurable: false,
  },
  {
    id: 'kanbanDrag',
    label: 'Kanban drag',
    description: 'Start or drop a card when using keyboard in Kanban view',
    binding: 'space',
    defaultBinding: 'space',
    configurable: false,
  },
];
