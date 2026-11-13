import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useArchiveProject, useCreateMilestone, useMilestones, useProject, useProjectSummary } from '../api/projects';
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
  const navigate = useNavigate();
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
  const tableSort = useViewStore((state) => state.tableSort);
  const tableGroup = useViewStore((state) => state.tableGroup);
  const toggleTableSort = useViewStore((state) => state.toggleTableSort);
  const setTableGroup = useViewStore((state) => state.setTableGroup);

  const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [breakdownError, setBreakdownError] = useState<{
    message: string;
    needsSettings: boolean;
  } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMilestone = useCreateMilestone(id ?? '');
  const breakdown = useBreakdown();
  const archiveProject = useArchiveProject();
  const projectSummary = useProjectSummary();

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

  function handleArchiveConfirm() {
    if (!id) return;
    archiveProject.mutate({ id }, {
      onSuccess: () => {
        void navigate('/projects/archived');
      },
    });
  }

  async function handleSummarize() {
    if (!id) return;
    setSummaryError(null);
    try {
      const result = await projectSummary.mutateAsync({ projectId: id });
      setSummaryText(result.summary);
    } catch (cause) {
      setSummaryError(cause instanceof Error ? cause.message : 'Could not generate summary');
    }
  }

  async function handleCopySummary() {
    if (!summaryText) return;
    const html = summaryText
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([summaryText], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(summaryText);
    }
    setCopied(true);
    setTimeout(() => {
      setSummaryText(null);
      setCopied(false);
    }, 800);
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
                Edit Project
              </Button>
              <Button
                onClick={() => { void handleSummarize(); }}
                disabled={projectSummary.isPending}
              >
                {projectSummary.isPending ? 'Summarizing…' : 'Summarize'}
              </Button>
              {confirmArchive ? (
                <>
                  <span className="text-xs text-zinc-500">Archive this project?</span>
                  <Button
                    onClick={handleArchiveConfirm}
                    disabled={archiveProject.isPending}
                  >
                    {archiveProject.isPending ? 'Archiving…' : 'Confirm Archive'}
                  </Button>
                  <Button onClick={() => { setConfirmArchive(false); }}>Cancel</Button>
                </>
              ) : (
                <Button onClick={() => { setConfirmArchive(true); }}>Archive</Button>
              )}
              <Button
                onClick={() => {
                  void runBreakdown();
                }}
                disabled={breakdown.isPending}
              >
                {breakdown.isPending ? 'Thinking…' : 'Break Down with AI'}
              </Button>
              <Button variant="primary" onClick={() => openCapture({ projectId: data.id })}>
                New Task
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
              <Field label="New Milestone">
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

      {summaryError && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700">
          <span>{summaryError}</span>
          <button
            type="button"
            className="ml-auto text-zinc-400 hover:text-zinc-600"
            onClick={() => { setSummaryError(null); }}
          >
            ✕
          </button>
        </div>
      )}

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
        sort={tableSort}
        group={tableGroup}
        onSort={toggleTableSort}
        onGroupChange={setTableGroup}
      />

      {/* AI summary overlay */}
      {summaryText !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => { setSummaryText(null); setCopied(false); }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-zinc-900">Project Summary</h2>
              <button
                type="button"
                className="shrink-0 text-zinc-400 hover:text-zinc-600"
                onClick={() => { setSummaryText(null); setCopied(false); }}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{summaryText}</p>

            <div className="mt-5 flex justify-end">
              <Button
                variant="primary"
                onClick={() => { void handleCopySummary(); }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
