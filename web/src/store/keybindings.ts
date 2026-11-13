import { create } from 'zustand';
import { NAV_SHORTCUTS } from '../lib/navShortcuts';

export type KeyBinding = {
  id: string;
  label: string;
  description: string;
  binding: string;
  defaultBinding: string;
  configurable: boolean;
  /** Allows a bare letter (e.g. "x") for shortcuts that ignore form fields. */
  allowBareKey?: boolean;
};

const STORAGE_KEY = 'docket:keybindings';

const DEFAULT_BINDINGS: Record<string, string> = {
  quickCapture: 'mod+k',
  aiCapture: 'mod+enter',
  toggleSidebar: 'x',
  askAssistant: 'ctrl+alt+shift+meta+a',
  shortcutHelp: 'shift+space',
  commandPalette: 'mod+p',
  ...Object.fromEntries(NAV_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut.binding])),
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
    label: 'Quick Capture',
    description: 'Open the capture dialog from anywhere',
    binding: 'mod+k',
    defaultBinding: 'mod+k',
    configurable: true,
  },
  {
    id: 'aiCapture',
    label: 'AI Capture',
    description: 'Parse the capture text with AI',
    binding: 'mod+enter',
    defaultBinding: 'mod+enter',
    configurable: true,
  },
  {
    id: 'toggleSidebar',
    label: 'Collapse / Expand Sidebar',
    description: 'Toggle the sidebar between full width and the icon rail',
    binding: 'x',
    defaultBinding: 'x',
    configurable: true,
    allowBareKey: true,
  },
  {
    id: 'askAssistant',
    label: 'Ask Assistant',
    description: 'Open the assistant drawer from anywhere',
    binding: 'ctrl+alt+shift+meta+a',
    defaultBinding: 'ctrl+alt+shift+meta+a',
    configurable: true,
  },
  {
    id: 'commandPalette',
    label: 'Command Palette',
    description: 'Search and jump to pages, projects and actions',
    binding: 'mod+p',
    defaultBinding: 'mod+p',
    configurable: true,
  },
  {
    id: 'shortcutHelp',
    label: 'Keyboard Shortcuts',
    description: 'Show the full list of shortcuts in an overlay',
    binding: 'shift+space',
    defaultBinding: 'shift+space',
    configurable: true,
  },
  ...NAV_SHORTCUTS.map((shortcut) => ({
    id: shortcut.id,
    label: shortcut.label,
    description: shortcut.description,
    binding: shortcut.binding,
    defaultBinding: shortcut.binding,
    configurable: true,
    allowBareKey: true,
  })),
  {
    id: 'saveCapture',
    label: 'Save Capture',
    description: 'Save the task directly from the capture dialog',
    binding: 'enter',
    defaultBinding: 'enter',
    configurable: false,
  },
  {
    id: 'closeDialog',
    label: 'Close Dialog',
    description: 'Dismiss the active dialog or modal',
    binding: 'escape',
    defaultBinding: 'escape',
    configurable: false,
  },
  {
    id: 'kanbanDrag',
    label: 'Kanban Drag',
    description: 'Start or drop a card when using keyboard in Kanban view',
    binding: 'space',
    defaultBinding: 'space',
    configurable: false,
  },
];
