import type { Task } from '@app/shared';
import { useCompleteTask, useTasks } from '../api/tasks';
import { CaptureHint } from '../components/CaptureDialog';
import { PageHeader } from '../components/PageHeader';
import { TaskListPanel, type TaskGroup } from '../components/TaskListPanel';
import { modKeyLabel } from '../lib/platform';
import { localDateString } from '../lib/today';
import { useUiStore } from '../store/ui';

/** FR-4/US-6: overdue work plus anything due today. */
export function TodayRoute() {
  const today = localDateString();
  const { data, isLoading, error, refetch } = useTasks({ dueTo: today });
  const completeTask = useCompleteTask();
  const openTask = useUiStore((state) => state.openTask);

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

  return (
    <>
      <PageHeader
        title="Today"
        description="Overdue work and anything due today."
        actions={<CaptureHint />}
      />

      <TaskListPanel
        groups={groups}
        isLoading={isLoading}
        error={error?.message}
        onRetry={() => {
          void refetch();
        }}
        emptyMessage={`Nothing due today. Press ${modKeyLabel()} K to capture.`}
        onOpen={openTask}
        onToggle={(id, done) => {
          completeTask.mutate({ id, done });
        }}
      />
    </>
  );
}
