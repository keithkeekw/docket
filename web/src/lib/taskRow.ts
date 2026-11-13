import type { Task } from '@app/shared';
import type { TaskRowTask } from '../components/TaskRow';
import { describeRecurrence } from './recurrence';

/**
 * One mapping from the API task to what TaskRow renders, so the dashboard, the
 * lists and the project screen cannot drift apart.
 */
export function toTaskRow(task: Task): TaskRowTask {
  return {
    id: task.id,
    title: task.title,
    done: task.statusCategory === 'done',
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    estimateMinutes: task.estimateMinutes,
    tags: task.tags,
    link: task.link ? { url: task.link.url, label: task.link.label } : null,
    checklist: task.checklist.total > 0 ? task.checklist : null,
    repeatLabel: describeRecurrence(task.recurrenceRule),
  };
}
