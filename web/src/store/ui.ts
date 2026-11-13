import type { Proposal, Task } from '@app/shared';
import { create } from 'zustand';

/** `create` from the sidebar, `edit` from a project screen. */
export type ProjectDialogState = { mode: 'create' } | { mode: 'edit'; projectId: string } | null;

type UiStore = {
  /** Global quick-capture modal (DESIGN §5.4). */
  captureOpen: boolean;
  /** When set, captured tasks land in that project instead of the Inbox. */
  captureProjectId: string | null;
  /** When set, capture opens the task in that status (Kanban column). */
  captureStatusId: string | null;
  openCapture: (options?: { projectId?: string | null; statusId?: string | null }) => void;
  closeCapture: () => void;

  /** Task shown in the detail drawer (DESIGN §5.5). `null` keeps it closed. */
  drawerTask: Task | null;
  openTask: (task: Task) => void;
  closeTask: () => void;

  /** Chat drawer (FR-22), mounted once in the shell. */
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;

  /** Pending AI proposal shown in the preview modal (FR-23). */
  proposal: Proposal | null;
  openProposal: (proposal: Proposal) => void;
  closeProposal: () => void;

  /** Project editor, mounted once in the shell (PROGRESS D29). */
  projectDialog: ProjectDialogState;
  openProjectDialog: (state: Exclude<ProjectDialogState, null>) => void;
  closeProjectDialog: () => void;
};

/**
 * UI-only state that several screens share. Server data stays in TanStack
 * Query; this store never holds a copy of a list (PROGRESS D26).
 */
export const useUiStore = create<UiStore>((set) => ({
  captureOpen: false,
  captureProjectId: null,
  captureStatusId: null,
  openCapture: (options) => {
    set({
      captureOpen: true,
      captureProjectId: options?.projectId ?? null,
      captureStatusId: options?.statusId ?? null,
    });
  },
  closeCapture: () => {
    set({ captureOpen: false, captureProjectId: null, captureStatusId: null });
  },

  drawerTask: null,
  openTask: (task) => {
    set({ drawerTask: task });
  },
  closeTask: () => {
    set({ drawerTask: null });
  },

  chatOpen: false,
  openChat: () => {
    set({ chatOpen: true });
  },
  closeChat: () => {
    set({ chatOpen: false });
  },

  proposal: null,
  openProposal: (proposal) => {
    set({ proposal });
  },
  closeProposal: () => {
    set({ proposal: null });
  },

  projectDialog: null,
  openProjectDialog: (state) => {
    set({ projectDialog: state });
  },
  closeProjectDialog: () => {
    set({ projectDialog: null });
  },
}));
