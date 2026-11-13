import { useCompleteTask, useTasks } from '../api/tasks';
import { modKeyLabel } from '../lib/platform';
import { Button } from '../components/Button';
import { CaptureHint } from '../components/CaptureDialog';
import { PageHeader } from '../components/PageHeader';
import { TaskListPanel } from '../components/TaskListPanel';
import { useUiStore } from '../store/ui';

/** FR-1/FR-4: unsorted work, newest capture at the bottom of the list. */
export function InboxRoute() {
  const { data, isLoading, error, refetch } = useTasks({ project: 'none' });
  const completeTask = useCompleteTask();
  const openTask = useUiStore((state) => state.openTask);
  const openCapture = useUiStore((state) => state.openCapture);

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Work that has no project yet."
        actions={
          <>
            <CaptureHint />
            <Button onClick={openCapture}>Capture</Button>
          </>
        }
      />

      <TaskListPanel
        groups={[{ label: 'Inbox', tasks: data?.tasks ?? [] }]}
        isLoading={isLoading}
        error={error?.message}
        onRetry={() => {
          void refetch();
        }}
        emptyMessage={`Inbox is empty. Press ${modKeyLabel()} K to capture.`}
        onOpen={openTask}
        onToggle={(id, done) => {
          completeTask.mutate({ id, done });
        }}
      />
    </>
  );
}
