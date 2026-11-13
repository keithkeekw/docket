import type { Task } from '@app/shared';

export const SORT_KEYS = [
  'title',
  'project',
  'milestone',
  'status',
  'priority',
  'due',
  'estimate',
  'repeat',
  'links',
] as const;

export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = 'asc' | 'desc';
export type TableSort = { key: SortKey; dir: SortDir };
export type TableGroup = 'none' | 'project' | 'status' | 'priority';

export type TaskGroup = { key: string; label: string; tasks: Task[] };

const text = (value: string | null | undefined): string => value ?? '';

function sortValue(task: Task, key: SortKey): string | number {
  switch (key) {
    case 'title':
      return task.title.toLowerCase();
    case 'project':
      return text(task.projectName ?? 'Inbox').toLowerCase();
    case 'milestone':
      return text(task.milestoneName).toLowerCase();
    case 'status':
      return task.statusName.toLowerCase();
    case 'priority':
      return task.priority;
    case 'due':
      // Undated tasks sort last in both directions of the "natural" order.
      return task.dueDate ? `${task.dueDate} ${task.dueTime ?? '99:99'}` : '9999-99-99';
    case 'estimate':
      return task.estimateMinutes ?? Number.MAX_SAFE_INTEGER;
    case 'repeat':
      return text(task.recurrenceRule).toLowerCase();
    case 'links':
      return text(task.link?.label).toLowerCase();
  }
}

/**
 * FR-13. Sorting is stable, so rows that compare equal keep the List order the
 * server chose (open first, then due date, then position).
 */
export function sortTasks(tasks: Task[], sort: TableSort | null): Task[] {
  if (!sort) return tasks;

  const direction = sort.dir === 'asc' ? 1 : -1;

  return [...tasks].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);

    if (left === right) return 0;
    return (left < right ? -1 : 1) * direction;
  });
}

/** Grouping keeps the sorted order inside each group (FR-13). */
export function groupTasks(tasks: Task[], group: TableGroup): TaskGroup[] {
  if (group === 'none') return [{ key: 'all', label: '', tasks }];

  const groups = new Map<string, TaskGroup>();

  for (const task of tasks) {
    const key =
      group === 'project'
        ? (task.projectId ?? 'inbox')
        : group === 'status'
          ? task.statusId
          : `p${task.priority}`;

    const label =
      group === 'project'
        ? (task.projectName ?? 'Inbox')
        : group === 'status'
          ? task.statusName
          : `P${task.priority}`;

    const existing = groups.get(key);
    if (existing) existing.tasks.push(task);
    else groups.set(key, { key, label, tasks: [task] });
  }

  return [...groups.values()];
}
