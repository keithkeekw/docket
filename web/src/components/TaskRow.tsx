import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { formatEstimate } from '../lib/estimate';
import { useT } from '../lib/i18n';
import { LinkBadge, LocationChip, TagChip } from './Badge';
import { Checkbox } from './Checkbox';
import { DueLabel } from './DueLabel';
import { PriorityLabel, type Priority } from './PriorityLabel';

export type TaskRowTask = {
  id: string;
  title: string;
  done?: boolean;
  projectName?: string | null;
  milestoneName?: string | null;
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
 * DESIGN §4 TaskRow. The meta cluster leads with project | milestone | priority,
 * then follows the spec (link, repeat, estimate, due, location) with checklist
 * progress and tags added by PROGRESS D9. The cluster wraps under the title
 * when the row is narrow.
 */
export function TaskRow({
  task,
  onToggle,
  onOpen,
  now,
  selectable = false,
  selected = false,
  onSelect,
  dragHandle,
  rowRef,
  rowStyle,
  isDragging = false,
  fadeOnComplete = false,
  pastTarget = false,
}: {
  task: TaskRowTask;
  onToggle?: (done: boolean) => void;
  onOpen?: (id: string) => void;
  now?: Date;
  /** In bulk mode the completion checkbox is replaced by a selection checkbox. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  dragHandle?: ReactNode;
  rowRef?: (node: HTMLLIElement | null) => void;
  rowStyle?: CSSProperties;
  isDragging?: boolean;
  /** Fades a freshly completed row out over 3 s in the open task lists. */
  fadeOnComplete?: boolean;
  /** Starts or is due after the project's target date. */
  pastTarget?: boolean;
}) {
  const t = useT();
  const estimate = formatEstimate(task.estimateMinutes);
  const checklist = task.checklist && task.checklist.total > 0 ? task.checklist : null;
  const tags = task.tags ?? [];

  const context: ReactNode[] = [];
  if (task.projectName) {
    context.push(
      <span key="project" className="max-w-[12rem] truncate text-zinc-600" title={task.projectName}>
        {task.projectName}
      </span>,
    );
  }
  if (task.milestoneName) {
    context.push(
      <span key="milestone" className="max-w-[12rem] truncate" title={task.milestoneName}>
        {task.milestoneName}
      </span>,
    );
  }
  if (task.priority) {
    context.push(<PriorityLabel key="priority" priority={task.priority} />);
  }

  const hasMeta = Boolean(
    context.length > 0 ||
    task.link ||
    task.repeatLabel ||
    estimate ||
    checklist ||
    task.dueDate ||
    task.location ||
    tags.length > 0,
  );

  const titleClassName = cx(
    'w-full text-left text-sm sm:min-w-[8rem] sm:flex-1',
    task.done
      ? 'text-zinc-500 line-through'
      : pastTarget
        ? 'font-semibold text-red-700'
        : 'text-zinc-900',
  );
  const pastTargetNote = pastTarget ? (
    <span className="sr-only"> ({t('After the project target date')})</span>
  ) : null;

  return (
    <li
      ref={rowRef}
      style={rowStyle}
      className={cx(
        'flex min-h-11 items-start gap-3 rounded-lg border-t border-zinc-100 px-3 py-2.5',
        pastTarget && 'bg-red-50',
        isDragging && 'relative z-10 bg-zinc-50 shadow-sm',
        fadeOnComplete &&
          task.done &&
          'animate-[task-fade-out_3s_ease-in_forwards] motion-reduce:animate-none',
      )}
    >
      {dragHandle}

      <span className="flex h-5 items-center">
        {selectable ? (
          <Checkbox
            round
            checked={selected}
            label={t('Select "{title}"', { title: task.title })}
            onChange={(checked) => {
              onSelect?.(checked);
            }}
          />
        ) : (
          <Checkbox
            checked={task.done ?? false}
            disabled={!onToggle}
            label={
              task.done
                ? t('Mark "{title}" as not done', { title: task.title })
                : t('Mark "{title}" as done', { title: task.title })
            }
            onChange={(checked) => {
              onToggle?.(checked);
            }}
          />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-1">
        {onOpen ? (
          <button
            type="button"
            data-task-id={task.id}
            className={titleClassName}
            onClick={() => {
              onOpen(task.id);
            }}
          >
            {task.title}
            {pastTargetNote}
          </button>
        ) : (
          <span className={titleClassName}>
            {task.title}
            {pastTargetNote}
          </span>
        )}

        {hasMeta && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {context.length > 0 && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {context.map((item, index) => (
                  <Fragment key={index}>
                    {index > 0 && (
                      <span aria-hidden="true" className="text-zinc-300">
                        |
                      </span>
                    )}
                    {item}
                  </Fragment>
                ))}
              </span>
            )}

            {task.link && <LinkBadge href={task.link.url}>{task.link.label}</LinkBadge>}

            {task.repeatLabel && (
              <span
                className="inline-flex items-center gap-1"
                title={t('Repeats {label}', { label: t(task.repeatLabel).toLowerCase() })}
              >
                <span aria-hidden="true">↻</span>
                {t(task.repeatLabel)}
              </span>
            )}

            {estimate && <span title={t('Estimate {value}', { value: estimate })}>{estimate}</span>}

            {checklist && (
              <span
                title={t('{done} of {total} checklist items done', {
                  done: checklist.done,
                  total: checklist.total,
                })}
              >
                <span aria-hidden="true">☑</span> {checklist.done}/{checklist.total}
              </span>
            )}

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
