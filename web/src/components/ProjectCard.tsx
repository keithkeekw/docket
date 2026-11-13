import type { ProjectSummary } from '@app/shared';
import { Link } from 'react-router';
import { ProgressBar } from './ProgressBar';

/**
 * DESIGN §4 ProjectCard: name + %, current milestone, progress bar, and a
 * footer with "11 of 19 tasks · Next: …". The whole card is a link (FR-9).
 */
export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { progress } = project;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block rounded-xl border border-zinc-200 bg-white px-[18px] py-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold text-zinc-900">{project.name}</span>
        <span className="shrink-0 text-xs text-zinc-600">{progress.percent}%</span>
      </div>

      <p className="mt-1 truncate text-xs text-zinc-500">
        {progress.currentMilestone?.name ?? 'No milestone yet'}
      </p>

      <div className="mt-2.5">
        <ProgressBar value={progress.percent} label={`${project.name} progress`} />
      </div>

      <p className="mt-2.5 truncate text-xs text-zinc-600">
        {progress.done} of {progress.total} {progress.total === 1 ? 'task' : 'tasks'}
        {progress.nextDueTask ? ` · Next: ${progress.nextDueTask.title}` : ''}
      </p>
    </Link>
  );
}
