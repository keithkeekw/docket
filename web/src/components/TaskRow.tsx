import { cx } from '../lib/cx';
import { formatEstimate } from '../lib/estimate';
import { LinkBadge, LocationChip, TagChip } from './Badge';
import { Checkbox } from './Checkbox';
import { DueLabel } from './DueLabel';
import { PriorityLabel, type Priority } from './PriorityLabel';

export type TaskRowTask = {
  id: string;
  title: string;
  done?: boolean;
  priority?: Priority;
  dueDate?: string | null;
  dueTime?: string | null;
  estimateMinutes?: number | null;
  repeatLabel?: string | null;
  link?: { url: string; label: string } | null;
  location?: string | null;
  tags?: readonly string[];
  checklist?: { done: number; total: number } | null;
};

/**
 * DESIGN §4 TaskRow. Meta cluster order follows the spec (link, repeat,
 * estimate, priority, due, location) with checklist progress and tags added by
 * PROGRESS D9. The cluster wraps under the title when the row is narrow.
 */
export function TaskRow({
  task,
  onToggle,
  onOpen,
  now,
}: {
  task: TaskRowTask;
  onToggle?: (done: boolean) => void;
  onOpen?: (id: string) => void;
  now?: Date;
}) {
  const estimate = formatEstimate(task.estimateMinutes);
  const checklist = task.checklist && task.checklist.total > 0 ? task.checklist : null;
  const tags = task.tags ?? [];

  const hasMeta = Boolean(
    task.link ||
    task.repeatLabel ||
    estimate ||
    checklist ||
    task.priority ||
    task.dueDate ||
    task.location ||
    tags.length > 0,
  );

  const titleClassName = cx(
    'min-w-[8rem] flex-1 text-left text-sm',
    task.done ? 'text-zinc-500 line-through' : 'text-zinc-900',
  );

  return (
    <li className="flex min-h-11 items-start gap-3 rounded-lg border-t border-zinc-100 px-3 py-2.5">
      <span className="flex h-5 items-center">
        <Checkbox
          checked={task.done ?? false}
          disabled={!onToggle}
          label={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
          onChange={(checked) => {
            onToggle?.(checked);
          }}
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {onOpen ? (
          <button
            type="button"
            className={titleClassName}
            onClick={() => {
              onOpen(task.id);
            }}
          >
            {task.title}
          </button>
        ) : (
          <span className={titleClassName}>{task.title}</span>
        )}

        {hasMeta && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {task.link && <LinkBadge href={task.link.url}>{task.link.label}</LinkBadge>}

            {task.repeatLabel && (
              <span
                className="inline-flex items-center gap-1"
                title={`Repeats ${task.repeatLabel.toLowerCase()}`}
              >
                <span aria-hidden="true">↻</span>
                {task.repeatLabel}
              </span>
            )}

            {estimate && <span title={`Estimate ${estimate}`}>{estimate}</span>}

            {checklist && (
              <span title={`${checklist.done} of ${checklist.total} checklist items done`}>
                <span aria-hidden="true">☑</span> {checklist.done}/{checklist.total}
              </span>
            )}

            {task.priority && <PriorityLabel priority={task.priority} />}

            <DueLabel
              dueDate={task.dueDate ?? null}
              dueTime={task.dueTime ?? null}
              isDone={task.done ?? false}
              now={now}
            />

            {task.location && <LocationChip>{task.location}</LocationChip>}

            {tags.map((tag) => (
              <TagChip key={tag}>{tag}</TagChip>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
