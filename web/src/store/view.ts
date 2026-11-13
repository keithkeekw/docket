import type { Priority } from '@app/shared';
import { create } from 'zustand';
import type { SortKey, TableGroup, TableSort } from '../lib/table';
import { resolveDueRange, type DueRange, type TaskFilter } from '../lib/taskFilters';
import type { ViewMode } from '../components/ViewSwitcher';

/** Filter state the screens edit. Dates are resolved at query time. */
export type UiFilters = {
  q: string;
  statusIds: string[];
  priorities: Priority[];
  project: 'none' | string | null;
  tag: string | null;
  dueRange: DueRange;
};

const EMPTY_FILTERS: UiFilters = {
  q: '',
  statusIds: [],
  priorities: [],
  project: null,
  tag: null,
  dueRange: 'any',
};

type ViewStore = {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  /** Table sorting and grouping (FR-13); kept here so a view switch keeps them. */
  tableSort: TableSort;
  tableGroup: TableGroup;
  toggleTableSort: (key: SortKey) => void;
  setTableGroup: (group: TableGroup) => void;
  filters: UiFilters;
  setFilters: (patch: Partial<UiFilters>) => void;
  clearFilters: () => void;
};

/**
 * TECHSTACK §2 puts "current view, filters" in Zustand. One store shared by All
 * tasks and the project screen is what makes FR-11 fall out: switching List →
 * Table → Kanban, or moving between screens, keeps every filter applied. The
 * filter row always shows what is on, so nothing is hidden.
 */
export const useViewStore = create<ViewStore>((set) => ({
  view: 'list',
  setView: (view) => {
    set({ view });
  },
  tableSort: { key: 'due', dir: 'asc' },
  tableGroup: 'none',
  toggleTableSort: (key) => {
    set((state) => ({
      tableSort:
        state.tableSort.key === key
          ? { key, dir: state.tableSort.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: 'asc' },
    }));
  },
  setTableGroup: (tableGroup) => {
    set({ tableGroup });
  },
  filters: EMPTY_FILTERS,
  setFilters: (patch) => {
    set((state) => ({ filters: { ...state.filters, ...patch } }));
  },
  clearFilters: () => {
    set({ filters: EMPTY_FILTERS });
  },
}));

/** Turns the UI filter state into the server filter, resolved for `now`. */
export function toServerFilter(filters: UiFilters, now: Date = new Date()): TaskFilter {
  return {
    ...(filters.project ? { project: filters.project } : {}),
    ...(filters.statusIds.length > 0 ? { statusIds: filters.statusIds } : {}),
    ...(filters.priorities.length > 0 ? { priorities: filters.priorities } : {}),
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.tag ? { tag: filters.tag } : {}),
    ...resolveDueRange(filters.dueRange, now),
  };
}
