import type { Status, Task } from '@app/shared';
import { groupTasks, sortTasks, type SortKey, type TableGroup, type TableSort } from '../lib/table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { InlineError } from './InlineError';
import { KanbanBoard } from './KanbanBoard';
import { TaskListPanel } from './TaskListPanel';
import type { ViewMode } from './ViewSwitcher';

/**
 * NFR-4: 10 columns × 5,000 rows takes seconds to paint. Sorting applies to the
 * whole set, then the table renders the first page of it (PROGRESS D67).
 */
const TABLE_ROW_LIMIT = 300;

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
  sort,
  group,
  onSort,
  onGroupChange,
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
  sort: TableSort;
  group: TableGroup;
  onSort: (key: SortKey) => void;
  onGroupChange: (group: TableGroup) => void;
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

    const sorted = sortTasks(tasks, sort);
    const visible = sorted.slice(0, TABLE_ROW_LIMIT);
    const truncated = sorted.length > TABLE_ROW_LIMIT;

    return (
      <>
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="table-group" className="text-xs text-zinc-500">
            Group by
          </label>
          <select
            id="table-group"
            className="min-h-9 rounded-[10px] border border-zinc-200 bg-white px-2 text-[13px] text-zinc-900"
            value={group}
            onChange={(event) => {
              onGroupChange(event.target.value as TableGroup);
            }}
          >
            <option value="none">Nothing</option>
            <option value="project">Project</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        <DataTable
          groups={groupTasks(visible, group)}
          sort={sort}
          onSort={onSort}
          onOpen={onOpen}
          onToggle={onToggle}
          footer={`${tableFooter.replace(' · sorted by due date', '')} · sorted by ${sort.key}${
            sort.dir === 'desc' ? ' (desc)' : ''
          }${truncated ? ` · showing first ${TABLE_ROW_LIMIT} of ${tasks.length}` : ''}`}
        />
      </>
    );
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
