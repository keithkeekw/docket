import type { Priority } from '@app/shared';
import { addDays, format, startOfDay, subDays } from 'date-fns';

/**
 * The filter the server understands (`GET /api/tasks`, TECHSTACK §5) and the
 * one the UI keeps in Zustand. Keeping them the same shape means a view switch
 * can never drop a filter (FR-11).
 */
export type TaskFilter = {
  /** `none` is the Inbox; any other value is a project id. */
  project?: 'none' | string;
  statusIds?: string[];
  priorities?: Priority[];
  dueFrom?: string;
  dueTo?: string;
  q?: string;
  tag?: string;
};

/** Semantic due ranges so "Today" stays today after midnight. */
export type DueRange = 'any' | 'overdue' | 'today' | 'week';

/**
 * Serialises a filter to a query string in a stable order. Two callers that
 * describe the same list must produce the same string, because it is also the
 * TanStack Query cache key.
 */
export function taskFilterQuery(filter: TaskFilter): string {
  const params = new URLSearchParams();

  if (filter.project) params.set('project', filter.project);
  if (filter.statusIds && filter.statusIds.length > 0) {
    params.set('status', [...filter.statusIds].sort().join(','));
  }
  if (filter.priorities && filter.priorities.length > 0) {
    params.set('priority', [...filter.priorities].sort((a, b) => a - b).join(','));
  }
  if (filter.dueFrom) params.set('due_from', filter.dueFrom);
  if (filter.dueTo) params.set('due_to', filter.dueTo);
  if (filter.q) params.set('q', filter.q);
  if (filter.tag) params.set('tag', filter.tag);

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * Resolves a semantic due range against the local calendar (D17). `now` is a
 * parameter so the mapping is testable and so a midnight rollover changes the
 * cache key.
 */
export function resolveDueRange(
  range: DueRange,
  now: Date = new Date(),
): { dueFrom?: string; dueTo?: string } {
  const today = startOfDay(now);
  const asDate = (date: Date) => format(date, 'yyyy-MM-dd');

  switch (range) {
    case 'overdue':
      return { dueTo: asDate(subDays(today, 1)) };
    case 'today':
      return { dueFrom: asDate(today), dueTo: asDate(today) };
    case 'week':
      return { dueFrom: asDate(today), dueTo: asDate(addDays(today, 7)) };
    default:
      return {};
  }
}

/** True when anything beyond the collection scope is narrowing the list. */
export function hasActiveFilters(filter: TaskFilter): boolean {
  return Boolean(
    (filter.statusIds && filter.statusIds.length > 0) ||
    (filter.priorities && filter.priorities.length > 0) ||
    filter.dueFrom ||
    filter.dueTo ||
    filter.q ||
    filter.tag ||
    filter.project,
  );
}
