import type { Status, Task } from '@app/shared';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { InlineError } from './InlineError';
import { KanbanBoard } from './KanbanBoard';
import { TaskListPanel } from './TaskListPanel';
import type { ViewMode } from './ViewSwitcher';

/**
 * One body shared by All tasks and the project screen, so List, Table and
 * Kanban never drift apart and a view switch keeps the same filtered data
 * (FR-10, FR-11).
 */
export function TaskViewBody({
  view,
  tasks,
  statuses,
  isLoading = false,
  error,
  onRetry,
  onOpen,
  onToggle,
  onStatusChange,
  onAddTask,
  emptyMessage,
  listLabel,
  tableFooter,
}: {
  view: ViewMode;
  tasks: Task[];
  statuses: Status[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onOpen: (task: Task) => void;
  onToggle: (id: string, done: boolean) => void;
  onStatusChange: (id: string, statusId: string) => void;
  onAddTask: (statusId: string) => void;
  emptyMessage: string;
  listLabel: string;
  tableFooter: string;
}) {
  // The list owns its own loading, empty and error states (one implementation).
  if (view === 'list') {
    return (
      <TaskListPanel
        groups={[{ label: listLabel, tasks }]}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyMessage={emptyMessage}
        onOpen={onOpen}
        onToggle={onToggle}
      />
    );
  }

  if (isLoading) {
    return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;
  }

  if (error) {
    return <InlineError message={error} onRetry={onRetry} />;
  }

  if (view === 'table') {
    if (tasks.length === 0) return <EmptyState message={emptyMessage} />;
    return <DataTable tasks={tasks} onOpen={onOpen} onToggle={onToggle} footer={tableFooter} />;
  }

  if (statuses.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <KanbanBoard
      statuses={statuses}
      tasks={tasks}
      onOpen={onOpen}
      onStatusChange={onStatusChange}
      onAddTask={onAddTask}
    />
  );
}
