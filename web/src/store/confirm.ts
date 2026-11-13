import { create } from 'zustand';

export type ConfirmOptions = {
  title: string;
  message: string;
  /** Defaults to "Delete" — every current caller is a destructive action. */
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmState = {
  options: ConfirmOptions | null;
  resolve: ((confirmed: boolean) => void) | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  respond: (confirmed: boolean) => void;
};

/**
 * Promise-based confirmation used before every delete. A single dialog is
 * mounted in the app shell, so callers only do:
 * `if (!(await confirmAction({ ... }))) return;`.
 */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  options: null,
  resolve: null,
  ask: (options) => {
    // A second prompt replaces the first; the superseded caller gets "no".
    get().resolve?.(false);
    return new Promise<boolean>((resolve) => {
      set({ options, resolve });
    });
  },
  respond: (confirmed) => {
    get().resolve?.(confirmed);
    set({ options: null, resolve: null });
  },
}));

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().ask(options);
}
