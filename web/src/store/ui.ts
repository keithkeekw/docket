import type { Task } from '@app/shared';
import { create } from 'zustand';

type UiStore = {
  /** Global quick-capture modal (DESIGN §5.4). */
  captureOpen: boolean;
  openCapture: () => void;
  closeCapture: () => void;
  /** Task shown in the detail drawer (DESIGN §5.5). `null` keeps it closed. */
  drawerTask: Task | null;
  openTask: (task: Task) => void;
  closeTask: () => void;
};

/**
 * UI-only state that several screens share. Server data stays in TanStack
 * Query; this store never holds a copy of a list (PROGRESS D26).
 */
export const useUiStore = create<UiStore>((set) => ({
  captureOpen: false,
  openCapture: () => {
    set({ captureOpen: true });
  },
  closeCapture: () => {
    set({ captureOpen: false });
  },
  drawerTask: null,
  openTask: (task) => {
    set({ drawerTask: task });
  },
  closeTask: () => {
    set({ drawerTask: null });
  },
}));
