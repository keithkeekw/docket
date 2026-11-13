import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useCreateMilestone, useMilestones, useProject } from '../api/projects';
import { ApiError } from '../api/client';
import { useBreakdown } from '../api/proposals';
import { useStatuses } from '../api/statuses';
import { useCompleteTask, useTasks, useUpdateTask } from '../api/tasks';
import { Button } from '../components/Button';
import { Field, Input } from '../components/Field';
import { InlineError } from '../components/InlineError';
import { AddMilestonePill, MilestonePill } from '../components/MilestonePill';
import { PageHeader } from '../components/PageHeader';
import { TaskViewBody } from '../components/TaskViewBody';
import { ViewSwitcher } from '../components/ViewSwitcher';
import { modKeyLabel } from '../lib/platform';
import { useUiStore } from '../store/ui';
import { useViewStore } from '../store/view';

/**
 * DESIGN §5.2 project detail: breadcrumb, title row, description, milestone
 * pills, toolbar, then List / Table / Kanban sharing one body (FR-10).
 */
export function ProjectRoute() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const milestones = useMilestones(id);
  const tasks = useTasks({ project: id }, Boolean(id));
  const statuses = useStatuses();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();

  const openTask = useUiStore((state) => state.openTask);
  const openCapture = useUiStore((state) => state.openCapture);
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const openProposal = useUiStore((state) => state.openProposal);

  const view = useViewStore((state) => state.view);
  const setView = useViewStore((state) => state.setView);

  const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [breakdownError, setBreakdownError] = useState<{ message: string; needsSettings: boolean } | null>(
    null,
  );

  const createMilestone = useCreateMilestone(id ?? '');
  const breakdown = useBreakdown();

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

  /** FR-18: the model proposes milestones and tasks; nothing is written until confirm. */
  async function runBreakdown() {
    try {
      const proposal = await breakdown.mutateAsync({ projectId: data.id });
      openProposal(proposal);
      setBreakdownError(null);
    } catch (cause) {
      setBreakdownError({
        message: cause instanceof Error ? cause.message : 'Could not break down the project',
        needsSettings: cause instanceof ApiError && cause.status === 503,
      });
    }
  }

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
              <Button
                onClick={() => {
                  void runBreakdown();
                }}
                disabled={breakdown.isPending}
              >
                {breakdown.isPending ? 'Thinking…' : 'Break down with AI'}
              </Button>
              <Button variant="primary" onClick={() => openCapture({ projectId: data.id })}>
                New task
              </Button>
            </>
          }
        />
      </div>

      {breakdownError && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700">
          <span>{breakdownError.message}</span>
          {breakdownError.needsSettings && (
            <Link to="/settings" className="text-blue-600 hover:underline">
              Open Settings
            </Link>
          )}
        </div>
      )}

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

      <TaskViewBody
        view={view}
        tasks={visibleTasks}
        statuses={statuses.data?.statuses ?? []}
        isLoading={tasks.isLoading}
        error={tasks.error?.message}
        onRetry={() => {
          void tasks.refetch();
        }}
        onOpen={openTask}
        onToggle={(taskId, done) => {
          completeTask.mutate({ id: taskId, done });
        }}
        onStatusChange={(taskId, statusId) => {
          updateTask.mutate({ id: taskId, statusId });
        }}
        onAddTask={(statusId) => {
          openCapture({ projectId: data.id, statusId });
        }}
        emptyMessage={
          activeMilestone
            ? `No tasks in ${activeMilestone.name}.`
            : `No tasks in this project yet. Press ${modKeyLabel()} K to capture.`
        }
        listLabel={data.name}
        tableFooter={`${visibleTasks.length} ${
          visibleTasks.length === 1 ? 'task' : 'tasks'
        } · sorted by due date`}
      />
    </>
  );
}
