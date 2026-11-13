import { format, parse } from 'date-fns';
import { Link } from 'react-router';
import { useDashboard } from '../api/dashboard';
import { useGenerateReview } from '../api/reviews';
import { useCompleteTask } from '../api/tasks';
import { Button } from '../components/Button';
import { CaptureBar } from '../components/CaptureBar';
import { GroupHeader } from '../components/GroupHeader';
import { InlineError } from '../components/InlineError';
import { ProjectCard } from '../components/ProjectCard';
import { ReviewCard } from '../components/ReviewCard';
import { TaskRow } from '../components/TaskRow';
import { modKeyLabel } from '../lib/platform';
import { toTaskRow } from '../lib/taskRow';
import { useUiStore } from '../store/ui';

/**
 * DESIGN §5.1 Dashboard: capture bar, the date as the page title with a summary
 * line, then Overdue → Today → Inbox tasks beside the active projects (FR-17).
 * "Ask assistant" and the review card wait for M2/M3 (D10).
 */
export function DashboardRoute() {
  const dashboard = useDashboard();
  const completeTask = useCompleteTask();
  const generateReview = useGenerateReview();
  const openTask = useUiStore((state) => state.openTask);
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const openChat = useUiStore((state) => state.openChat);

  const data = dashboard.data;
  const day = data ? parse(data.date, 'yyyy-MM-dd', new Date()) : new Date();

  const counts = data?.counts ?? { overdue: 0, today: 0, inbox: 0 };
  const summary =
    [
      counts.today > 0 ? `${counts.today} due today` : null,
      counts.overdue > 0 ? `${counts.overdue} overdue` : null,
      counts.inbox > 0 ? `${counts.inbox} in inbox` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'Nothing due';

  const groups = [
    { label: 'Overdue', tone: 'overdue' as const, tasks: data?.groups.overdue ?? [] },
    { label: 'Today', tone: 'default' as const, tasks: data?.groups.today ?? [] },
    { label: 'Inbox · unsorted', tone: 'default' as const, tasks: data?.groups.inbox ?? [] },
  ].filter((group) => group.tasks.length > 0);

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[16rem] flex-1">
          <CaptureBar />
        </div>
        <Button onClick={openChat}>Ask assistant</Button>
      </div>

      <header className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {format(day, 'EEEE, d MMMM')}
        </h1>
        <p className="text-xs text-zinc-500">{summary}</p>
      </header>

      {dashboard.isLoading && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}

      {dashboard.error && (
        <InlineError
          message={dashboard.error.message}
          onRetry={() => {
            void dashboard.refetch();
          }}
        />
      )}

      {data?.latestReview && (
        <div className="mt-6">
          <ReviewCard
            review={data.latestReview}
            regenerating={generateReview.isPending}
            onRegenerate={() => {
              generateReview.mutate({ kind: data.latestReview?.kind ?? 'daily' });
            }}
          />
        </div>
      )}

      {generateReview.error && (
        <p className="mt-2 text-xs text-zinc-700">{generateReview.error.message}</p>
      )}

      {data && (
        <div className="mt-6 grid gap-6 min-[900px]:grid-cols-[3fr_2fr]">
          <section aria-labelledby="dashboard-tasks">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="dashboard-tasks" className="text-[15px] font-semibold text-zinc-900">
                Tasks
              </h2>
              <Link to="/tasks" className="text-[13px] text-blue-600 hover:underline">
                Open in table
              </Link>
            </div>

            {groups.length === 0 ? (
              <p className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500">
                Nothing due. Press {modKeyLabel()} K to capture.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white pb-1">
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
          </section>

          <section aria-labelledby="dashboard-projects">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="dashboard-projects" className="text-[15px] font-semibold text-zinc-900">
                Active projects
              </h2>
              <button
                type="button"
                className="text-[13px] text-blue-600 hover:underline"
                onClick={() => {
                  openProjectDialog({ mode: 'create' });
                }}
              >
                New project
              </button>
            </div>

            {data.activeProjects.length === 0 ? (
              <p className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500">
                No active projects yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2.5">
                {data.activeProjects.map((project) => (
                  <li key={project.id}>
                    <ProjectCard project={project} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
