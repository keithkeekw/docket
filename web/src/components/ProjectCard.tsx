import type { ProjectSummary } from '@app/shared';
import { Link } from 'react-router';
import { useT } from '../lib/i18n';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

/**
 * DESIGN §4 ProjectCard: name + %, current milestone, progress bar, and a
 * footer with "11 of 19 tasks · Next: …". The card body links to the project;
 * a completed project also offers Archive outside the link.
 */
export function ProjectCard({
  project,
  onArchive,
  archiving = false,
}: {
  project: ProjectSummary;
  onArchive?: () => void;
  archiving?: boolean;
}) {
  const t = useT();
  const { progress } = project;
  const complete = progress.percent === 100;
  const taskCount = t(progress.total === 1 ? '{done} of {total} task' : '{done} of {total} tasks', {
    done: progress.done,
    total: progress.total,
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-[18px] py-4">
      <Link to={`/projects/${project.id}`} className="block">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-zinc-900">{project.name}</span>
          <span className="shrink-0 text-xs text-zinc-600">{progress.percent}%</span>
        </div>

        <p className="mt-1 truncate text-xs text-zinc-500">
          {progress.currentMilestone?.name ?? t('No milestone yet')}
        </p>

        <div className="mt-2.5">
          <ProgressBar
            value={progress.percent}
            label={t('{name} progress', { name: project.name })}
          />
        </div>

        <p className="mt-2.5 truncate text-xs text-zinc-600">
          {taskCount}
          {progress.nextDueTask
            ? ` · ${t('Next: {title}', { title: progress.nextDueTask.title })}`
            : ''}
        </p>
      </Link>

      {complete && onArchive && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
          <span className="text-[11px] font-medium text-zinc-500">{t('Project Complete')}</span>
          <Button onClick={onArchive} disabled={archiving}>
            {archiving ? t('Archiving…') : t('Archive')}
          </Button>
        </div>
      )}
    </div>
  );
}
