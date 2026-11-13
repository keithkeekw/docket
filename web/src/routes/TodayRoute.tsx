import type { Task } from '@app/shared';
import { useState } from 'react';
import { useStatuses } from '../api/statuses';
import { useCompleteTask, useTasks, useUpdateTask } from '../api/tasks';
import { PageHeader } from '../components/PageHeader';
import { QuickCaptureButton } from '../components/QuickCaptureButton';
import { TaskListPanel, type TaskGroup } from '../components/TaskListPanel';
import { TaskViewBody } from '../components/TaskViewBody';
import { ViewSwitcher, type ViewMode } from '../components/ViewSwitcher';
import { useT } from '../lib/i18n';
import { localDateString } from '../lib/today';
import type { SortKey, TableGroup, TableSort } from '../lib/table';
import { useUiStore } from '../store/ui';

/** FR-4/US-6: overdue work plus anything due today. */
export function TodayRoute() {
  const t = useT();
  const today = localDateString();
  const { data, isLoading, error, refetch } = useTasks({ dueTo: today });
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const statuses = useStatuses();
  const openTask = useUiStore((state) => state.openTask);
  const openCapture = useUiStore((state) => state.openCapture);

  const [view, setView] = useState<ViewMode>('list');
  const [sort, setSort] = useState<TableSort>({ key: 'due', dir: 'asc' });
  const [group, setGroup] = useState<TableGroup>('none');

  const tasks = data?.tasks ?? [];

  const groups: TaskGroup[] = [
    {
      label: 'Overdue',
      tone: 'overdue',
      tasks: tasks.filter((task: Task) => task.dueDate !== null && task.dueDate < today),
    },
    {
      label: 'Today',
      tasks: tasks.filter((task) => task.dueDate === today),
    },
  ];

  const emptyMessage = t('Nothing due today.');

  const viewControls = (
    <div className="flex items-center gap-2">
      <QuickCaptureButton
        onClick={() => {
          openCapture();
        }}
      />
      <ViewSwitcher value={view} onChange={setView} />
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
        title={t('Today')}
        description={t('Overdue work and anything due today.')}
      />

      {view === 'list' ? (
        <TaskListPanel
          groups={groups}
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
          viewSwitcher={viewControls}
        />
      ) : (
        <TaskViewBody
          view={view}
          tasks={tasks}
          statuses={statuses.data?.statuses ?? []}
          isLoading={isLoading}
          error={error?.message}
          onRetry={() => {
            void refetch();
          }}
          onOpen={openTask}
          onToggle={(id, done) => {
            completeTask.mutate({ id, done });
          }}
          onStatusChange={(id, statusId) => {
            updateTask.mutate({ id, statusId });
          }}
          onAddTask={(statusId) => {
            openCapture({ statusId });
          }}
          emptyMessage={emptyMessage}
          listLabel="Today"
          tableFooter={t(tasks.length === 1 ? '{count} task' : '{count} tasks', {
            count: tasks.length,
          })}
          sort={sort}
          group={group}
          onSort={toggleSort}
          onGroupChange={setGroup}
          viewSwitcher={viewControls}
        />
      )}
    </>
  );
}
