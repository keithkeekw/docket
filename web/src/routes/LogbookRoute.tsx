import { useState } from 'react';
import { useBulkDeleteTasks, useBulkRestoreTasks, useCompleteTask, useTasks } from '../api/tasks';
import { Checkbox } from '../components/Checkbox';
import { EmptyState } from '../components/EmptyState';
import { GroupHeader } from '../components/GroupHeader';
import { InlineError } from '../components/InlineError';
import { PageHeader } from '../components/PageHeader';
import { PrelineTooltip } from '../components/PrelineTooltip';
import { TaskRow } from '../components/TaskRow';
import { cx } from '../lib/cx';
import { toTaskRow } from '../lib/taskRow';
import { useT } from '../lib/i18n';
import { confirmAction } from '../store/confirm';
import { useUiStore } from '../store/ui';

const ICON_BUTTON =
  'inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * The Logbook keeps finished work out of the active lists. Unchecking a row
 * calls the normal completion endpoint with `done: false`, which reactivates
 * the task in its old collection. Selection mode restores or deletes in bulk.
 */
export function LogbookRoute() {
  const t = useT();
  const tasks = useTasks({ completed: 'only' });
  const completeTask = useCompleteTask();
  const bulkDelete = useBulkDeleteTasks();
  const bulkRestore = useBulkRestoreTasks();
  const openTask = useUiStore((state) => state.openTask);
  const showUndo = useUiStore((state) => state.showUndo);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);

  const rows = tasks.data?.tasks ?? [];
  const selectedIds = rows.filter((task) => selected.has(task.id)).map((task) => task.id);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const busy = bulkDelete.isPending || bulkRestore.isPending;

  function cancelSelection() {
    setSelecting(false);
    setSelected(new Set());
    setActionError(null);
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function restoreSelected() {
    if (selectedIds.length === 0) return;

    setActionError(null);
    setRestoredMessage(null);
    try {
      const result = await bulkRestore.mutateAsync({ ids: selectedIds });
      cancelSelection();
      setRestoredMessage(
        t(result.restored === 1 ? '{count} task restored' : '{count} tasks restored', {
          count: result.restored,
        }),
      );
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t('Could not restore the tasks'));
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;

    const confirmed = await confirmAction({
      title: t('Delete Selected Tasks'),
      message: t(
        selectedIds.length === 1
          ? '{count} selected task will be deleted.'
          : '{count} selected tasks will be deleted.',
        { count: selectedIds.length },
      ),
      confirmLabel: t('Delete Tasks'),
    });
    if (!confirmed) return;

    setActionError(null);
    setRestoredMessage(null);
    try {
      const result = await bulkDelete.mutateAsync({ ids: selectedIds });
      cancelSelection();
      showUndo(
        t(result.deleted === 1 ? '{count} task deleted' : '{count} tasks deleted', {
          count: result.deleted,
        }),
      );
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t('Could not delete the tasks'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('Logbook')}
        description={t('Completed tasks are kept here. Uncheck one to reactivate it.')}
      />

      {tasks.isLoading && <p className="mt-6 text-sm text-zinc-500">{t('Loading…')}</p>}

      {tasks.error && (
        <InlineError
          message={tasks.error.message}
          onRetry={() => {
            void tasks.refetch();
          }}
        />
      )}

      {completeTask.error && <InlineError message={completeTask.error.message} />}

      {!tasks.isLoading && !tasks.error && rows.length === 0 && (
        <EmptyState message={t('No completed tasks yet. Finish a task and it will appear here.')} />
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            {actionError && <span className="mr-auto text-xs text-red-600">{actionError}</span>}
            {restoredMessage && !actionError && (
              <span className="mr-auto text-xs text-emerald-700">{restoredMessage}</span>
            )}

            {selecting ? (
              <>
                <label className="mr-1 inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-700">
                  <Checkbox
                    round
                    checked={allSelected}
                    label={t('Select All')}
                    disabled={busy}
                    onChange={(checked) => {
                      setSelected(checked ? new Set(rows.map((task) => task.id)) : new Set());
                    }}
                  />
                  {t('Select All')}
                </label>
                <span className="text-xs text-zinc-600">
                  {t('{count} selected', { count: selectedIds.length })}
                </span>
                <PrelineTooltip
                  label={bulkRestore.isPending ? t('Restoring…') : t('Restore Selected')}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void restoreSelected();
                    }}
                    disabled={selectedIds.length === 0 || busy}
                    aria-label={bulkRestore.isPending ? t('Restoring…') : t('Restore Selected')}
                    className={ICON_BUTTON}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={cx(
                        'size-4',
                        bulkRestore.isPending && 'animate-pulse motion-reduce:animate-none',
                      )}
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </PrelineTooltip>
                <PrelineTooltip
                  label={bulkDelete.isPending ? t('Deleting…') : t('Delete Selected')}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void deleteSelected();
                    }}
                    disabled={selectedIds.length === 0 || busy}
                    aria-label={bulkDelete.isPending ? t('Deleting…') : t('Delete Selected')}
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={cx(
                        'size-4',
                        bulkDelete.isPending && 'animate-pulse motion-reduce:animate-none',
                      )}
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </PrelineTooltip>
                <PrelineTooltip label={t('Cancel')}>
                  <button
                    type="button"
                    onClick={cancelSelection}
                    aria-label={t('Cancel')}
                    className={ICON_BUTTON}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="size-4"
                      aria-hidden="true"
                    >
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </PrelineTooltip>
              </>
            ) : (
              <PrelineTooltip label={t('Select Tasks')}>
                <button
                  type="button"
                  onClick={() => {
                    setRestoredMessage(null);
                    setSelecting(true);
                  }}
                  aria-label={t('Select Tasks')}
                  className={ICON_BUTTON}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="14" height="14" rx="2.5" />
                    <path d="m6.5 10 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </PrelineTooltip>
            )}
          </div>

          <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white pb-1">
            <GroupHeader label={t('Completed')} count={rows.length} />
            <ul>
              {rows.map((task) => (
                <TaskRow
                  key={task.id}
                  task={toTaskRow(task)}
                  selectable={selecting}
                  selected={selected.has(task.id)}
                  onSelect={(checked) => {
                    toggleSelected(task.id, checked);
                  }}
                  onOpen={() => {
                    openTask(task);
                  }}
                  onToggle={(done) => {
                    if (!done) completeTask.mutate({ id: task.id, done: false });
                  }}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
