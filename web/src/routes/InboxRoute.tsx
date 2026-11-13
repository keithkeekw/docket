import { useState } from 'react';
import { useCompleteTask, useTasks } from '../api/tasks';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { InlineError } from '../components/InlineError';
import { PageHeader } from '../components/PageHeader';
import { QuickCaptureButton } from '../components/QuickCaptureButton';
import { TaskListPanel } from '../components/TaskListPanel';
import { ViewSwitcher, type ViewMode } from '../components/ViewSwitcher';
import { useT } from '../lib/i18n';
import { SORT_LABELS, groupTasks, sortTasks, type SortKey, type TableSort } from '../lib/table';
import { useUiStore } from '../store/ui';

/** FR-1/FR-4: unsorted work, newest capture at the bottom of the list. */
export function InboxRoute() {
  const t = useT();
  const { data, isLoading, error, refetch } = useTasks({ project: 'none' });
  const completeTask = useCompleteTask();
  const openTask = useUiStore((state) => state.openTask);
  const openCapture = useUiStore((state) => state.openCapture);

  const [view, setView] = useState<ViewMode>('list');
  const [sort, setSort] = useState<TableSort>({ key: 'due', dir: 'asc' });

  const rows = data?.tasks ?? [];
  const emptyMessage = t('Inbox is empty.');

  const sortField = t(SORT_LABELS[sort.key]);
  const sortedBy =
    sort.dir === 'desc'
      ? t('{label} (desc)', { label: t('sorted by {field}', { field: sortField }) })
      : t('sorted by {field}', { field: sortField });
  const footer = `${t(rows.length === 1 ? '{count} task' : '{count} tasks', {
    count: rows.length,
  })} · ${sortedBy}`;

  const viewControls = (
    <div className="flex items-center gap-2">
      <QuickCaptureButton
        onClick={() => {
          openCapture();
        }}
      />
      <ViewSwitcher value={view} onChange={setView} views={['list', 'table']} />
    </div>
  );

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  }

  return (
    <>
      <PageHeader
        title={t('Inbox')}
        description={t('Work that has no project yet.')}
      />

      {view === 'table' ? (
        <>
          <div className="mt-6 flex justify-end">{viewControls}</div>
          {isLoading ? (
            <p className="mt-2 text-sm text-zinc-500">{t('Loading…')}</p>
          ) : error ? (
            <InlineError
              message={error.message}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : rows.length === 0 ? (
            <EmptyState message={emptyMessage} />
          ) : (
            <DataTable
              groups={groupTasks(sortTasks(rows, sort), 'none')}
              sort={sort}
              onSort={toggleSort}
              onOpen={openTask}
              onToggle={(id, done) => {
                completeTask.mutate({ id, done });
              }}
              footer={footer}
            />
          )}
        </>
      ) : (
        <TaskListPanel
          groups={[{ label: 'Inbox', tasks: rows }]}
          isLoading={isLoading}
          error={error?.message}
          onRetry={() => {
            void refetch();
          }}
          emptyMessage={emptyMessage}
          onOpen={openTask}
          onToggle={(id, done) => {
            completeTask.mutate({ id, done });
          }}
          autoAssign
          viewSwitcher={viewControls}
        />
      )}
    </>
  );
}
