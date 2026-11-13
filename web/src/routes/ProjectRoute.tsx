import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { useCreateMilestone, useMilestones, useProject } from '../api/projects';
import { useCompleteTask, useTasks } from '../api/tasks';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Field, Input } from '../components/Field';
import { InlineError } from '../components/InlineError';
import { AddMilestonePill, MilestonePill } from '../components/MilestonePill';
import { PageHeader } from '../components/PageHeader';
import { TaskListPanel } from '../components/TaskListPanel';
import { ViewSwitcher, type ViewMode } from '../components/ViewSwitcher';
import { modKeyLabel } from '../lib/platform';
import { useUiStore } from '../store/ui';

/**
 * DESIGN §5.2 project detail: breadcrumb, title row, description, milestone
 * pills, toolbar, then the task list. Kanban and Table arrive in M1-S7.
 */
export function ProjectRoute() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const milestones = useMilestones(id);
  const tasks = useTasks({ project: id }, Boolean(id));
  const completeTask = useCompleteTask();

  const openTask = useUiStore((state) => state.openTask);
  const openCapture = useUiStore((state) => state.openCapture);
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);

  const [view, setView] = useState<ViewMode>('list');
  const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');

  const createMilestone = useCreateMilestone(id ?? '');

  if (project.error) {
    return (
      <>
        <PageHeader title="Project" />
        <InlineError
          message={project.error.message}
          onRetry={() => {
            void project.refetch();
          }}
        />
      </>
    );
  }

  if (!project.data) {
    return (
      <>
        <PageHeader title="Project" />
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      </>
    );
  }

  const data = project.data;
  const pills = milestones.data?.milestones ?? [];
  const allTasks = tasks.data?.tasks ?? [];
  const visibleTasks = milestoneFilter
    ? allTasks.filter((task) => task.milestoneId === milestoneFilter)
    : allTasks;

  const activeMilestone = pills.find((milestone) => milestone.id === milestoneFilter);

  async function addMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = milestoneName.trim();
    if (!name) return;

    await createMilestone.mutateAsync({ name });
    setMilestoneName('');
    setAddingMilestone(false);
  }

  return (
    <>
      <p className="text-[13px] text-zinc-500">Projects / {data.name}</p>

      <div className="mt-1">
        <PageHeader
          title={data.name}
          description={data.description || undefined}
          actions={
            <>
              <Button
                onClick={() => {
                  openProjectDialog({ mode: 'edit', projectId: data.id });
                }}
              >
                Edit project
              </Button>
              <Button variant="primary" onClick={() => openCapture(data.id)}>
                New task
              </Button>
            </>
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {pills.map((milestone) => (
          <MilestonePill
            key={milestone.id}
            milestone={milestone}
            current={data.progress.currentMilestone?.id === milestone.id}
            selected={milestoneFilter === milestone.id}
            onSelect={() => {
              setMilestoneFilter((current) => (current === milestone.id ? null : milestone.id));
            }}
          />
        ))}

        {addingMilestone ? (
          <form className="flex items-end gap-2" onSubmit={addMilestone}>
            <div className="w-[200px]">
              <Field label="New milestone">
                <Input
                  autoFocus
                  value={milestoneName}
                  onChange={(event) => {
                    setMilestoneName(event.target.value);
                  }}
                />
              </Field>
            </div>
            <Button type="submit" disabled={!milestoneName.trim() || createMilestone.isPending}>
              Add
            </Button>
            <Button
              onClick={() => {
                setAddingMilestone(false);
                setMilestoneName('');
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <AddMilestonePill
            onClick={() => {
              setAddingMilestone(true);
            }}
          />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <ViewSwitcher value={view} onChange={setView} />
        <p className="text-xs text-zinc-500">
          Showing: {activeMilestone ? activeMilestone.name : 'all tasks'}
        </p>
      </div>

      {view === 'list' ? (
        <TaskListPanel
          groups={[{ label: data.name, tasks: visibleTasks }]}
          isLoading={tasks.isLoading}
          error={tasks.error?.message}
          onRetry={() => {
            void tasks.refetch();
          }}
          emptyMessage={
            activeMilestone
              ? `No tasks in ${activeMilestone.name}.`
              : `No tasks in this project yet. Press ${modKeyLabel()} K to capture.`
          }
          onOpen={openTask}
          onToggle={(taskId, done) => {
            completeTask.mutate({ id: taskId, done });
          }}
        />
      ) : (
        <EmptyState message={`${view === 'table' ? 'Table' : 'Kanban'} view arrives in M1-S7.`} />
      )}
    </>
  );
}
