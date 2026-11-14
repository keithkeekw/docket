import type { Task } from '@app/shared';

type DatedTask = Pick<Task, 'startDate' | 'dueDate' | 'statusCategory'>;

/**
 * An open task that starts or is due after its project's target date cannot
 * finish on time. Completed tasks are left alone.
 */
export function isPastTargetDate(task: DatedTask, targetDate: string | null): boolean {
  if (!targetDate || task.statusCategory === 'done') return false;
  return (
    (task.startDate !== null && task.startDate > targetDate) ||
    (task.dueDate !== null && task.dueDate > targetDate)
  );
}
