import { useCompleteTask, useTasks } from '../api/tasks';
import { EmptyState } from '../components/EmptyState';
import { GroupHeader } from '../components/GroupHeader';
import { InlineError } from '../components/InlineError';
import { PageHeader } from '../components/PageHeader';
import { TaskRow } from '../components/TaskRow';
import { toTaskRow } from '../lib/taskRow';
import { useT } from '../lib/i18n';
import { useUiStore } from '../store/ui';

/**
 * The Logbook keeps finished work out of the active lists. Unchecking a row
 * calls the normal completion endpoint with `done: false`, which reactivates
 * the task in its old collection.
 */
export function LogbookRoute() {
  const t = useT();
  const tasks = useTasks({ completed: 'only' });
  const completeTask = useCompleteTask();
  const openTask = useUiStore((state) => state.openTask);

  const rows = tasks.data?.tasks ?? [];

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
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white pb-1">
          <GroupHeader label={t('Completed')} count={rows.length} />
          <ul>
            {rows.map((task) => (
              <TaskRow
                key={task.id}
                task={toTaskRow(task)}
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
      )}
    </>
  );
}
