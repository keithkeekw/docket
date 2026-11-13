import type { Task } from '@app/shared';
import { EmptyState } from './EmptyState';
import { GroupHeader } from './GroupHeader';
import { InlineError } from './InlineError';
import { TaskRow } from './TaskRow';

export type TaskGroup = {
  label: string;
  tone?: 'default' | 'overdue';
  tasks: Task[];
};

/**
 * List view shared by Inbox and Today (DESIGN §5.5): one white panel, groups
 * with a count, TaskRows inside. Loading, empty and error states follow
 * DESIGN §6.
 */
export function TaskListPanel({
  groups,
  isLoading = false,
  error,
  onRetry,
  emptyMessage,
  onOpen,
  onToggle,
}: {
  groups: TaskGroup[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage: string;
  onOpen: (task: Task) => void;
  onToggle: (id: string, done: boolean) => void;
}) {
  if (isLoading) {
    return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;
  }

  if (error) {
    return <InlineError message={error} onRetry={onRetry} />;
  }

  const visible = groups.filter((group) => group.tasks.length > 0);

  if (visible.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white pb-1">
      {visible.map((group) => (
        <section key={group.label}>
          <GroupHeader label={group.label} count={group.tasks.length} tone={group.tone} />
          <ul>
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={{
                  id: task.id,
                  title: task.title,
                  done: task.statusCategory === 'done',
                  priority: task.priority,
                  dueDate: task.dueDate,
                  dueTime: task.dueTime,
                  estimateMinutes: task.estimateMinutes,
                }}
                onOpen={() => {
                  onOpen(task);
                }}
                onToggle={(done) => {
                  onToggle(task.id, done);
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
