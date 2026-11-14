import type { Status, Task } from '@app/shared';
import type { ReactNode } from 'react';
import { useT } from '../lib/i18n';
import {
  SORT_LABELS,
  groupTasks,
  sortTasks,
  type SortKey,
  type TableGroup,
  type TableSort,
} from '../lib/table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { Select } from './Field';
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
  autoAssign = false,
  viewSwitcher,
  isPastTarget,
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
  /** Show the Auto-Assign Top 3 action in List view. */
  autoAssign?: boolean;
  /** View control shown with the list actions or above Table/Kanban. */
  viewSwitcher?: ReactNode;
  /** Highlights tasks that start or are due after the project's target date. */
  isPastTarget?: (task: Task) => boolean;
}) {
  const t = useT();

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
        autoAssign={autoAssign}
        viewSwitcher={viewSwitcher}
        isPastTarget={isPastTarget}
      />
    );
  }

  const switcherRow = viewSwitcher ? (
    <div className="mt-6 flex justify-end">{viewSwitcher}</div>
  ) : null;

  if (isLoading) {
    return (
      <>
        {switcherRow}
        <p className="mt-2 text-sm text-zinc-500">{t('Loading…')}</p>
      </>
    );
  }

  if (error) {
    return (
      <>
        {switcherRow}
        <InlineError message={error} onRetry={onRetry} />
      </>
    );
  }

  if (view === 'table') {
    if (tasks.length === 0) {
      return (
        <>
          {switcherRow}
          <EmptyState message={emptyMessage} />
        </>
      );
    }

    const sorted = sortTasks(tasks, sort);
    const visible = sorted.slice(0, TABLE_ROW_LIMIT);
    const truncated = sorted.length > TABLE_ROW_LIMIT;

    const sortField = t(SORT_LABELS[sort.key]);
    const sortedBy =
      sort.dir === 'desc'
        ? t('{label} (desc)', { label: t('sorted by {field}', { field: sortField }) })
        : t('sorted by {field}', { field: sortField });
    const footer = [
      tableFooter,
      sortedBy,
      truncated
        ? t('showing first {limit} of {total}', {
            limit: TABLE_ROW_LIMIT,
            total: tasks.length,
          })
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="table-group" className="text-xs text-zinc-500">
              {t('Group by')}
            </label>
            <Select
              id="table-group"
              wrapperClassName="w-40"
              value={group}
              onChange={(event) => {
                onGroupChange(event.target.value as TableGroup);
              }}
            >
              <option value="none">{t('Nothing')}</option>
              <option value="project">{t('Project')}</option>
              <option value="status">{t('Status')}</option>
              <option value="priority">{t('Priority')}</option>
            </Select>
          </div>
          {viewSwitcher}
        </div>

        <DataTable
          groups={groupTasks(visible, group)}
          sort={sort}
          onSort={onSort}
          onOpen={onOpen}
          onToggle={onToggle}
          footer={footer}
          isPastTarget={isPastTarget}
        />
      </>
    );
  }

  if (statuses.length === 0) {
    return (
      <>
        {switcherRow}
        <p className="mt-2 text-sm text-zinc-500">{t('Loading…')}</p>
      </>
    );
  }

  return (
    <>
      {switcherRow}
      <KanbanBoard
        statuses={statuses}
        tasks={tasks}
        onOpen={onOpen}
        onStatusChange={onStatusChange}
        onAddTask={onAddTask}
        isPastTarget={isPastTarget}
      />
    </>
  );
}
