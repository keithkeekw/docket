import { format, parse } from 'date-fns';
import { useState } from 'react';
import { Link } from 'react-router';
import { useDashboard } from '../api/dashboard';
import { useArchiveProject } from '../api/projects';
import { useGenerateReview } from '../api/reviews';
import { useCompleteTask } from '../api/tasks';
import { CaptureBar } from '../components/CaptureBar';
import { DashboardCalendar } from '../components/DashboardCalendar';
import { DashboardClocks } from '../components/DashboardClocks';
import { DashboardLayout } from '../components/DashboardLayout';
import { GroupHeader } from '../components/GroupHeader';
import { PrelineTooltip } from '../components/PrelineTooltip';
import { cx } from '../lib/cx';
import { useDateLocale, useLocale, useT } from '../lib/i18n';
import { InlineError } from '../components/InlineError';
import { ProjectCard } from '../components/ProjectCard';
import { ReviewCard } from '../components/ReviewCard';
import { TaskRow } from '../components/TaskRow';
import { YearProgress } from '../components/YearProgress';
import { toTaskRow } from '../lib/taskRow';
import { useUiStore } from '../store/ui';

/**
 * DESIGN §5.1 Dashboard: the date as the page title, the capture bar, then
 * Overdue → Today → Inbox tasks beside the active projects (FR-17).
 * "Ask assistant" and the review card wait for M2/M3 (D10).
 */
export function DashboardRoute() {
  const t = useT();
  const dateLocale = useDateLocale();
  const locale = useLocale();
  const dashboard = useDashboard();
  const completeTask = useCompleteTask();
  const generateReview = useGenerateReview();
  const archiveProject = useArchiveProject();
  const openTask = useUiStore((state) => state.openTask);
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const [editing, setEditing] = useState(false);

  const data = dashboard.data;
  const day = data ? parse(data.date, 'yyyy-MM-dd', new Date()) : new Date();

  const groups = [
    { label: t('Overdue'), tone: 'overdue' as const, tasks: data?.groups.overdue ?? [] },
    { label: t('Today'), tone: 'default' as const, tasks: data?.groups.today ?? [] },
    { label: t('Inbox · Unsorted'), tone: 'default' as const, tasks: data?.groups.inbox ?? [] },
  ].filter((group) => group.tasks.length > 0);

  const latestReview = data?.latestReview;

  return (
    <div className="mx-auto max-w-[1120px]">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {format(day, locale === 'zh' ? 'M月d日 EEEE' : 'EEEE, d MMMM', { locale: dateLocale })}
          </h1>
        </div>
        <DashboardClocks />
        <YearProgress />
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <CaptureBar />
        </div>
        <PrelineTooltip label={editing ? t('Done Rearranging') : t('Rearrange Cards')}>
          <button
            type="button"
            onClick={() => {
              setEditing((current) => !current);
            }}
            disabled={!data}
            aria-label={editing ? t('Done Rearranging') : t('Rearrange Cards')}
            aria-pressed={editing}
            className={cx(
              'inline-flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              editing
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
            )}
          >
            {editing ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-5"
                aria-hidden="true"
              >
                <circle cx="6" cy="4" r="1" />
                <circle cx="10" cy="4" r="1" />
                <circle cx="6" cy="8" r="1" />
                <circle cx="10" cy="8" r="1" />
                <circle cx="6" cy="12" r="1" />
                <circle cx="10" cy="12" r="1" />
              </svg>
            )}
          </button>
        </PrelineTooltip>
      </div>

      {editing && (
        <p className="mt-3 text-xs text-zinc-500">
          {t(
            'Drag the cards by their handle to rearrange them. The order is saved on this device.',
          )}
        </p>
      )}

      {dashboard.isLoading && <p className="mt-6 text-sm text-zinc-500">{t('Loading…')}</p>}

      {dashboard.error && (
        <InlineError
          message={dashboard.error.message}
          onRetry={() => {
            void dashboard.refetch();
          }}
        />
      )}

      {data && (
        <DashboardLayout
          editing={editing}
          cards={[
            ...(latestReview
              ? [
                  {
                    id: 'review',
                    title: t('Review'),
                    fullWidth: true,
                    node: (
                      <ReviewCard
                        review={latestReview}
                        regenerating={generateReview.isPending}
                        onRegenerate={() => {
                          generateReview.mutate({ kind: latestReview.kind });
                        }}
                      />
                    ),
                  },
                ]
              : []),
            {
              id: 'tasks',
              title: t('Tasks'),
              defaultColumn: 'left',
              node: (
                <section aria-labelledby="dashboard-tasks" className="min-w-0">
                  <h2 id="dashboard-tasks" className="text-[15px] font-semibold text-zinc-900">
                    {t('Tasks')}
                  </h2>

                  <div className="relative mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <span className="absolute top-1.5 right-1.5 z-10">
                      <PrelineTooltip label={t('Open in Table')}>
                        <Link
                          to="/tasks"
                          aria-label={t('Open in Table')}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
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
                              d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5ZM3.25 4.5a.75.75 0 0 0-.75.75v2.25h15V5.25a.75.75 0 0 0-.75-.75H3.25ZM18.25 9H15v3.5h3.25V9Zm0 5h-3.25v1.5h1.75a.75.75 0 0 0 .75-.75V14Zm-4.75 1.5V14H9.5v1.5h4ZM8 15.5V14H1.75v.75c0 .414.336.75.75.75H8Zm-6.25-3H8V9H1.75v3.5ZM9.5 9v3.5h4V9h-4Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Link>
                      </PrelineTooltip>
                    </span>

                    {groups.length === 0 ? (
                      <p className="py-6 pr-12 pl-4 text-sm text-zinc-500">
                        {t('Nothing due. Your to-do list is officially a to-done list.')}
                      </p>
                    ) : (
                      <div className="pb-1">
                        {groups.map((group) => (
                          <section key={group.label}>
                            <GroupHeader
                              label={group.label}
                              count={group.tasks.length}
                              tone={group.tone}
                            />
                            <ul>
                              {group.tasks.map((task) => (
                                <TaskRow
                                  key={task.id}
                                  task={toTaskRow(task)}
                                  onOpen={() => {
                                    openTask(task);
                                  }}
                                  onToggle={(done) => {
                                    completeTask.mutate({ id: task.id, done });
                                  }}
                                />
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ),
            },
            {
              id: 'calendar',
              title: t('Calendar'),
              defaultColumn: 'right',
              node: <DashboardCalendar />,
            },
            {
              id: 'projects',
              title: t('Active Projects'),
              defaultColumn: 'left',
              node: (
                <section aria-labelledby="dashboard-projects" className="min-w-0">
                  <h2 id="dashboard-projects" className="text-[15px] font-semibold text-zinc-900">
                    {t('Active Projects')}
                  </h2>

                  {data.activeProjects.length === 0 ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-6">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-700">
                          {t('No active projects.')}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {t(
                            'Enjoy it while it lasts — an empty list is the only list that never needs a status update.',
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                        onClick={() => {
                          openProjectDialog({ mode: 'create' });
                        }}
                      >
                        <PlusIcon />
                        {t('New Project')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <ul className="mt-3 grid grid-cols-1 gap-2.5">
                        {data.activeProjects.map((project) => (
                          <li key={project.id}>
                            <ProjectCard
                              project={project}
                              archiving={
                                archiveProject.isPending &&
                                archiveProject.variables?.id === project.id
                              }
                              onArchive={() => {
                                archiveProject.mutate({ id: project.id });
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="mt-2 inline-flex min-h-7 items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-white hover:text-zinc-900"
                        onClick={() => {
                          openProjectDialog({ mode: 'create' });
                        }}
                      >
                        <PlusIcon className="size-3.5" />
                        {t('New Project')}
                      </button>
                    </>
                  )}
                </section>
              ),
            },
          ]}
        />
      )}

      {generateReview.error && (
        <p className="mt-2 text-xs text-zinc-700">{generateReview.error.message}</p>
      )}
    </div>
  );
}

function PlusIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 3a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 10 3Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
