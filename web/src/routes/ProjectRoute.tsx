import type { Milestone } from '@app/shared';
import { format, parseISO } from 'date-fns';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useArchiveProject, useCreateMilestone, useMilestones, useProject, useProjectSummary, useUpdateMilestone } from '../api/projects';
import { ApiError } from '../api/client';
import { useBreakdown } from '../api/proposals';
import { useStatuses } from '../api/statuses';
import { useCompleteTask, useTasks, useUpdateTask } from '../api/tasks';
import { Button } from '../components/Button';
import { Field, Input } from '../components/Field';
import { InlineError } from '../components/InlineError';
import { AddMilestonePill, MilestonePill } from '../components/MilestonePill';
import { PageHeader } from '../components/PageHeader';
import { QuickCaptureButton } from '../components/QuickCaptureButton';
import { TaskViewBody } from '../components/TaskViewBody';
import { ViewSwitcher } from '../components/ViewSwitcher';
import { useDateLocale, useLocale, useT } from '../lib/i18n';
import { useUiStore } from '../store/ui';
import { useViewStore } from '../store/view';

/**
 * DESIGN §5.2 project detail: breadcrumb, title row, description, milestone
 * pills, toolbar, then List / Table / Kanban sharing one body (FR-10).
 */
export function ProjectRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const dateLocale = useDateLocale();
  const locale = useLocale();
  const project = useProject(id);
  const milestones = useMilestones(id);
  const view = useViewStore((state) => state.view);
  const tasks = useTasks(
    { project: id, ...(view === 'kanban' ? { completed: 'all' as const } : {}) },
    Boolean(id),
  );
  const statuses = useStatuses();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();

  const openTask = useUiStore((state) => state.openTask);
  const openCapture = useUiStore((state) => state.openCapture);
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const openProposal = useUiStore((state) => state.openProposal);
  const setProjectContext = useUiStore((state) => state.setProjectContext);
  const clearProjectContext = useUiStore((state) => state.clearProjectContext);

  const setView = useViewStore((state) => state.setView);
  const tableSort = useViewStore((state) => state.tableSort);
  const tableGroup = useViewStore((state) => state.tableGroup);
  const toggleTableSort = useViewStore((state) => state.toggleTableSort);
  const setTableGroup = useViewStore((state) => state.setTableGroup);

  const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);
  const seededProjectRef = useRef<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [breakdownError, setBreakdownError] = useState<{
    message: string;
    needsSettings: boolean;
  } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Opening a project starts on its first unfinished milestone.
  useEffect(() => {
    const projectData = project.data;
    if (!projectData || projectData.id !== id) return;
    if (seededProjectRef.current === projectData.id) return;

    seededProjectRef.current = projectData.id;
    setMilestoneFilter(projectData.progress.currentMilestone?.id ?? null);
  }, [project.data, id]);

  // The global Quick Capture shortcut reads this context.
  useEffect(() => {
    const projectData = project.data;
    if (!projectData) {
      clearProjectContext();
      return;
    }

    const selected = milestones.data?.milestones.find(
      (milestone) => milestone.id === milestoneFilter,
    );
    setProjectContext({
      projectId: projectData.id,
      projectName: projectData.name,
      milestoneId: selected?.id ?? null,
      milestoneName: selected?.name ?? null,
    });
  }, [project.data, milestones.data, milestoneFilter, setProjectContext, clearProjectContext]);

  useEffect(() => () => clearProjectContext(), [clearProjectContext]);

  const createMilestone = useCreateMilestone(id ?? '');
  const updateMilestone = useUpdateMilestone(id ?? '');
  const breakdown = useBreakdown();
  const archiveProject = useArchiveProject();
  const projectSummary = useProjectSummary();

  if (project.error) {
    return (
      <>
        <PageHeader title={t('Project')} />
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
        <PageHeader title={t('Project')} />
        <p className="mt-6 text-sm text-zinc-500">{t('Loading…')}</p>
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
  const currentMilestone = data.progress.currentMilestone
    ? pills.find((milestone) => milestone.id === data.progress.currentMilestone?.id)
    : undefined;
  const milestoneToComplete =
    activeMilestone && !activeMilestone.completedAt
      ? activeMilestone
      : !activeMilestone && currentMilestone && !currentMilestone.completedAt
        ? currentMilestone
        : undefined;
  const captureMilestone = activeMilestone
    ? { milestoneId: activeMilestone.id, milestoneName: activeMilestone.name }
    : { milestoneId: null, milestoneName: null };

  /** FR-18: the model proposes milestones and tasks; nothing is written until confirm. */
  async function runBreakdown() {
    try {
      const proposal = await breakdown.mutateAsync({ projectId: data.id });
      openProposal(proposal);
      setBreakdownError(null);
    } catch (cause) {
      setBreakdownError({
        message: cause instanceof Error ? cause.message : t('Could not break down the project'),
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
      setSummaryError(cause instanceof Error ? cause.message : t('Could not generate summary'));
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

  async function completeMilestone(milestone: Milestone) {
    setMilestoneError(null);
    try {
      await updateMilestone.mutateAsync({
        id: milestone.id,
        completedAt: new Date().toISOString(),
      });

      // Follow the dot to the next unfinished milestone.
      setMilestoneFilter((current) => {
        if (current !== milestone.id) return current;
        const next = pills.find(
          (entry) => entry.id !== milestone.id && !entry.completedAt,
        );
        return next?.id ?? null;
      });
    } catch (cause) {
      setMilestoneError(
        cause instanceof Error ? cause.message : t('Could not complete the milestone'),
      );
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
      <p className="text-[13px] text-zinc-500">
        {t('Projects')} / {data.name}
      </p>

      <div className="mt-3">
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
                {t('Edit Project')}
              </Button>
              <Button
                onClick={() => { void handleSummarize(); }}
                disabled={projectSummary.isPending}
              >
                {projectSummary.isPending ? t('Summarizing…') : t('Summarize')}
              </Button>
              {confirmArchive ? (
                <>
                  <span className="text-xs text-zinc-500">{t('Archive this project?')}</span>
                  <Button
                    onClick={handleArchiveConfirm}
                    disabled={archiveProject.isPending}
                  >
                    {archiveProject.isPending ? t('Archiving…') : t('Confirm Archive')}
                  </Button>
                  <Button onClick={() => { setConfirmArchive(false); }}>{t('Cancel')}</Button>
                </>
              ) : (
                <Button onClick={() => { setConfirmArchive(true); }}>{t('Archive')}</Button>
              )}
              <Button
                onClick={() => {
                  void runBreakdown();
                }}
                disabled={breakdown.isPending}
              >
                {breakdown.isPending ? t('Thinking…') : t('Break Down with AI')}
              </Button>
              <Button
                variant="primary"
                onClick={() => openCapture({ projectId: data.id, ...captureMilestone })}
              >
                {t('New Task')}
              </Button>
            </>
          }
        />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0" aria-hidden="true">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
        <span>{t('Target Date:')}</span>
        <span className="font-medium text-zinc-700">
          {data.targetDate
            ? format(parseISO(data.targetDate), locale === 'zh' ? 'yyyy年M月d日' : 'd MMMM yyyy', { locale: dateLocale })
            : t('Not set')}
        </span>
      </p>

      {breakdownError && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700">
          <span>{breakdownError.message}</span>
          {breakdownError.needsSettings && (
            <Link to="/settings" className="text-blue-600 hover:underline">
              {t('Open Settings')}
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
              <Field label={t('New Milestone')}>
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
              {t('Add')}
            </Button>
            <Button
              onClick={() => {
                setAddingMilestone(false);
                setMilestoneName('');
              }}
            >
              {t('Cancel')}
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
        <div className="flex items-center gap-2">
          <ViewSwitcher value={view} onChange={setView} />
          <QuickCaptureButton
            onClick={() => {
              openCapture({ projectId: data.id, ...captureMilestone });
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {milestoneToComplete && (
            <Button
              onClick={() => {
                void completeMilestone(milestoneToComplete);
              }}
              disabled={updateMilestone.isPending}
              aria-label={t('Complete {name}', { name: milestoneToComplete.name })}
              title={t('Complete {name}', { name: milestoneToComplete.name })}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
              {updateMilestone.isPending ? t('Completing…') : t('Complete milestone')}
            </Button>
          )}
          <p className="text-xs text-zinc-500">
            {t('Showing: {value}', {
              value: activeMilestone ? activeMilestone.name : t('all tasks'),
            })}
          </p>
        </div>
      </div>

      {milestoneError && <p className="mt-2 text-xs text-red-600">{milestoneError}</p>}

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
          openCapture({ projectId: data.id, statusId, ...captureMilestone });
        }}
        emptyMessage={
          activeMilestone
            ? t('No tasks in {project}.', { project: activeMilestone.name })
            : t('No tasks in this project yet.')
        }
        listLabel={data.name}
        tableFooter={t(visibleTasks.length === 1 ? '{count} task' : '{count} tasks', {
          count: visibleTasks.length,
        })}
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
              <h2 className="text-[15px] font-semibold text-zinc-900">{t('Project Summary')}</h2>
              <button
                type="button"
                className="shrink-0 text-zinc-400 hover:text-zinc-600"
                onClick={() => { setSummaryText(null); setCopied(false); }}
                aria-label={t('Close')}
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
                {copied ? t('Copied!') : t('Copy')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
