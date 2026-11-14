import type { Milestone } from '@app/shared';
import { format, parseISO } from 'date-fns';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  useArchiveProject,
  useCreateMilestone,
  useMilestones,
  useProject,
  useProjectSummary,
  useReorderMilestones,
  useUpdateMilestone,
} from '../api/projects';
import { ApiError } from '../api/client';
import { useBreakdown } from '../api/proposals';
import { useStatuses } from '../api/statuses';
import { useCompleteTask, useTasks, useUpdateTask } from '../api/tasks';
import { Button } from '../components/Button';
import { Field, Input } from '../components/Field';
import { InlineError } from '../components/InlineError';
import { MilestoneBar } from '../components/MilestoneBar';
import { AddMilestonePill } from '../components/MilestonePill';
import { PageHeader } from '../components/PageHeader';
import { PrelineTooltip } from '../components/PrelineTooltip';
import { ProjectTimelineDialog } from '../components/ProjectTimelineDialog';
import { TaskViewBody } from '../components/TaskViewBody';
import { ViewSwitcher } from '../components/ViewSwitcher';
import { cx } from '../lib/cx';
import { useDateLocale, useLocale, useT } from '../lib/i18n';
import { isPastTargetDate } from '../lib/targetDate';
import { useRemoveMilestone } from '../lib/useRemoveMilestone';
import { useUiStore } from '../store/ui';
import { useViewStore } from '../store/view';

const ICON_BUTTON =
  'inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';
const DANGER_ICON_BUTTON =
  'inline-flex size-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_ICON_BUTTON =
  'inline-flex size-10 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50';

/** Header action as an icon; the tooltip and accessible name carry the label. */
function HeaderIconButton({
  label,
  onClick,
  busy = false,
  primary = false,
  children,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <PrelineTooltip label={label}>
      <button
        type="button"
        className={primary ? PRIMARY_ICON_BUTTON : ICON_BUTTON}
        aria-label={label}
        disabled={busy}
        onClick={onClick}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cx('size-4', busy && 'animate-pulse motion-reduce:animate-none')}
          aria-hidden="true"
        >
          {children}
        </svg>
      </button>
    </PrelineTooltip>
  );
}

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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [breakdownError, setBreakdownError] = useState<{
    message: string;
    needsSettings: boolean;
  } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
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
  const reorderMilestones = useReorderMilestones(id ?? '');
  const removeMilestone = useRemoveMilestone(id ?? '');
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
    archiveProject.mutate(
      { id },
      {
        onSuccess: () => {
          void navigate('/projects/archived');
        },
      },
    );
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
        const next = pills.find((entry) => entry.id !== milestone.id && !entry.completedAt);
        return next?.id ?? null;
      });
    } catch (cause) {
      setMilestoneError(
        cause instanceof Error ? cause.message : t('Could not complete the milestone'),
      );
    }
  }

  async function renameMilestone(milestone: Milestone, name: string) {
    setRenamingId(null);
    setMilestoneError(null);
    try {
      await updateMilestone.mutateAsync({ id: milestone.id, name });
    } catch (cause) {
      setMilestoneError(cause instanceof Error ? cause.message : t('Could not rename'));
    }
  }

  async function reorder(ids: string[]) {
    setMilestoneError(null);
    try {
      await reorderMilestones.mutateAsync({ ids });
    } catch (cause) {
      setMilestoneError(cause instanceof Error ? cause.message : t('Could not reorder milestones'));
    }
  }

  async function deleteMilestone(milestone: Milestone) {
    setMilestoneError(null);
    try {
      if (await removeMilestone.remove(milestone)) {
        setMilestoneFilter((current) => (current === milestone.id ? null : current));
      }
    } catch (cause) {
      setMilestoneError(
        cause instanceof Error ? cause.message : t('Could not delete the milestone'),
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
              <HeaderIconButton
                label={t('Edit Project')}
                onClick={() => {
                  openProjectDialog({ mode: 'edit', projectId: data.id });
                }}
              >
                <path d="M10 3.75a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 4.5a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM5 3.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM4.25 17a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM17.25 17a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM9 10a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1 0-1.5h5.5A.75.75 0 0 1 9 10ZM17.25 10.75a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM10 16.25a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" />
              </HeaderIconButton>
              <HeaderIconButton
                label={t('Timeline')}
                onClick={() => {
                  setTimelineOpen(true);
                }}
              >
                <rect x="2" y="3" width="9" height="3.5" rx="1.25" />
                <rect x="6" y="8.25" width="9" height="3.5" rx="1.25" />
                <rect x="10" y="13.5" width="8" height="3.5" rx="1.25" />
              </HeaderIconButton>
              <HeaderIconButton
                label={projectSummary.isPending ? t('Summarizing…') : t('Summarize')}
                busy={projectSummary.isPending}
                onClick={() => {
                  void handleSummarize();
                }}
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
                  clipRule="evenodd"
                />
              </HeaderIconButton>
              {confirmArchive ? (
                <>
                  <span className="text-xs text-zinc-500">{t('Archive this project?')}</span>
                  <HeaderIconButton
                    label={archiveProject.isPending ? t('Archiving…') : t('Confirm Archive')}
                    busy={archiveProject.isPending}
                    onClick={handleArchiveConfirm}
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </HeaderIconButton>
                  <HeaderIconButton
                    label={t('Cancel')}
                    onClick={() => {
                      setConfirmArchive(false);
                    }}
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </HeaderIconButton>
                </>
              ) : (
                <HeaderIconButton
                  label={t('Archive')}
                  onClick={() => {
                    setConfirmArchive(true);
                  }}
                >
                  <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z" />
                  <path
                    fillRule="evenodd"
                    d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5ZM7 11a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Z"
                    clipRule="evenodd"
                  />
                </HeaderIconButton>
              )}
              <HeaderIconButton
                label={breakdown.isPending ? t('Thinking…') : t('Break Down with AI')}
                busy={breakdown.isPending}
                onClick={() => {
                  void runBreakdown();
                }}
              >
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
              </HeaderIconButton>
              <HeaderIconButton
                label={t('New Task')}
                primary
                onClick={() => openCapture({ projectId: data.id, ...captureMilestone })}
              >
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </HeaderIconButton>
            </>
          }
        />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-3.5 shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
            clipRule="evenodd"
          />
        </svg>
        <span>{t('Target Date:')}</span>
        <span className="font-medium text-zinc-700">
          {data.targetDate
            ? format(parseISO(data.targetDate), locale === 'zh' ? 'yyyy年M月d日' : 'd MMMM yyyy', {
                locale: dateLocale,
              })
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

      <MilestoneBar
        milestones={pills}
        currentId={data.progress.currentMilestone?.id ?? null}
        selectedId={milestoneFilter}
        renamingId={renamingId}
        onSelect={(milestoneId) => {
          setMilestoneFilter((current) => (current === milestoneId ? null : milestoneId));
        }}
        onStartRename={setRenamingId}
        onRename={(milestone, name) => {
          void renameMilestone(milestone, name);
        }}
        onRenameCancel={() => {
          setRenamingId(null);
        }}
        onReorder={(ids) => {
          void reorder(ids);
        }}
      >
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
      </MilestoneBar>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <ViewSwitcher value={view} onChange={setView} />
        <div className="flex flex-wrap items-center gap-2">
          {activeMilestone && (
            <>
              <PrelineTooltip label={t('Rename {name}', { name: activeMilestone.name })}>
                <button
                  type="button"
                  className={ICON_BUTTON}
                  aria-label={t('Rename {name}', { name: activeMilestone.name })}
                  onClick={() => {
                    setRenamingId(activeMilestone.id);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                  </svg>
                </button>
              </PrelineTooltip>
              <PrelineTooltip label={t('Delete {name}', { name: activeMilestone.name })}>
                <button
                  type="button"
                  className={DANGER_ICON_BUTTON}
                  aria-label={t('Delete {name}', { name: activeMilestone.name })}
                  disabled={removeMilestone.isPending}
                  onClick={() => {
                    void deleteMilestone(activeMilestone);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={cx(
                      'size-4',
                      removeMilestone.isPending && 'animate-pulse motion-reduce:animate-none',
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
            </>
          )}
          {milestoneToComplete && (
            <PrelineTooltip
              label={
                updateMilestone.isPending
                  ? t('Completing…')
                  : t('Complete {name}', { name: milestoneToComplete.name })
              }
            >
              <button
                type="button"
                className={ICON_BUTTON}
                onClick={() => {
                  void completeMilestone(milestoneToComplete);
                }}
                disabled={updateMilestone.isPending}
                aria-label={t('Complete {name}', { name: milestoneToComplete.name })}
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
              </button>
            </PrelineTooltip>
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
            onClick={() => {
              setSummaryError(null);
            }}
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
        isPastTarget={(task) => isPastTargetDate(task, data.targetDate)}
      />

      {/* AI summary overlay */}
      {summaryText !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setSummaryText(null);
            setCopied(false);
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-zinc-900">{t('Project Summary')}</h2>
              <button
                type="button"
                className="shrink-0 text-zinc-400 hover:text-zinc-600"
                onClick={() => {
                  setSummaryText(null);
                  setCopied(false);
                }}
                aria-label={t('Close')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {summaryText}
            </p>

            <div className="mt-5 flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  void handleCopySummary();
                }}
              >
                {copied ? t('Copied!') : t('Copy')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {timelineOpen && (
        <ProjectTimelineDialog
          projectId={data.id}
          milestones={pills}
          onClose={() => {
            setTimelineOpen(false);
          }}
        />
      )}
    </>
  );
}
