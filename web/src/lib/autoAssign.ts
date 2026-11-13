import type { Task } from '@app/shared';

/**
 * Status order for picking today's work: In Progress first, then New/open
 * statuses, then any other active status.
 */
function statusRank(task: Task): number {
  const name = task.statusName.trim().toLowerCase();
  if (name.includes('in progress')) return 0;
  if (name === 'new' || task.statusCategory === 'open') return 1;
  return 2;
}

/**
 * Picks the top tasks to work on today. Priority is the primary key (P1 before
 * P2 before P3); ties go to In Progress, then New, then other active statuses.
 * Earlier due dates sort first, undated work last, then title.
 */
export function pickTopTasks(tasks: Task[], limit = 3): Task[] {
  return [...tasks]
    .filter((task) => task.statusCategory !== 'done')
    .sort((a, b) => {
      const priority = a.priority - b.priority;
      if (priority !== 0) return priority;

      const status = statusRank(a) - statusRank(b);
      if (status !== 0) return status;

      const dueA = a.dueDate ?? '9999-99-99';
      const dueB = b.dueDate ?? '9999-99-99';
      if (dueA !== dueB) return dueA < dueB ? -1 : 1;

      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}
