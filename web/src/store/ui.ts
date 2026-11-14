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
  /** When set, capture files the task under the selected milestone. */
  captureMilestoneId: string | null;
  captureMilestoneName: string | null;
  openCapture: (options?: {
    projectId?: string | null;
    statusId?: string | null;
    milestoneId?: string | null;
    milestoneName?: string | null;
  }) => void;
  closeCapture: () => void;

  /** Task shown in the detail drawer (DESIGN §5.5). `null` keeps it closed. */
  drawerTask: Task | null;
  openTask: (task: Task) => void;
  closeTask: () => void;

  /** Label of the last destructive action, shown in the undo bar (FR-29). */
  undoLabel: string | null;
  showUndo: (label: string) => void;
  clearUndo: () => void;

  /** Chat drawer (FR-22), mounted once in the shell. */
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;

  /** Pending AI proposal shown in the preview modal (FR-23). */
  proposal: Proposal | null;
  openProposal: (proposal: Proposal) => void;
  closeProposal: () => void;

  /** Project currently on screen, used by the global Quick Capture shortcut. */
  projectContext: {
    projectId: string;
    projectName: string;
    milestoneId: string | null;
    milestoneName: string | null;
  } | null;
  setProjectContext: (context: NonNullable<UiStore['projectContext']>) => void;
  clearProjectContext: () => void;

  /** Project editor, mounted once in the shell (PROGRESS D29). */
  projectDialog: ProjectDialogState;
  openProjectDialog: (state: Exclude<ProjectDialogState, null>) => void;
  closeProjectDialog: () => void;

  /** Sidebar collapsed state — icon-only when true. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

/**
 * UI-only state that several screens share. Server data stays in TanStack
 * Query; this store never holds a copy of a list (PROGRESS D26).
 */
export const useUiStore = create<UiStore>((set, get) => ({
  captureOpen: false,
  captureProjectId: null,
  captureStatusId: null,
  captureMilestoneId: null,
  captureMilestoneName: null,
  openCapture: (options) => {
    const context = get().projectContext;
    set({
      captureOpen: true,
      captureProjectId: options?.projectId ?? (options ? null : context?.projectId ?? null),
      captureStatusId: options?.statusId ?? null,
      captureMilestoneId:
        options?.milestoneId ?? (options ? null : context?.milestoneId ?? null),
      captureMilestoneName:
        options?.milestoneName ?? (options ? null : context?.milestoneName ?? null),
    });
  },
  closeCapture: () => {
    set({
      captureOpen: false,
      captureProjectId: null,
      captureStatusId: null,
      captureMilestoneId: null,
      captureMilestoneName: null,
    });
  },

  drawerTask: null,
  openTask: (task) => {
    set({ drawerTask: task });
  },
  closeTask: () => {
    set({ drawerTask: null });
  },

  undoLabel: null,
  showUndo: (undoLabel) => {
    set({ undoLabel });
  },
  clearUndo: () => {
    set({ undoLabel: null });
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

  projectContext: null,
  setProjectContext: (projectContext) => {
    set({ projectContext });
  },
  clearProjectContext: () => {
    set({ projectContext: null });
  },

  projectDialog: null,
  openProjectDialog: (state) => {
    set({ projectDialog: state });
  },
  closeProjectDialog: () => {
    set({ projectDialog: null });
  },

  sidebarCollapsed: false,
  toggleSidebar: () => {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
  },
}));
