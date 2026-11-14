import type { Task } from '@app/shared';
import { Fragment } from 'react';
import { cx } from '../lib/cx';
import { formatEstimate } from '../lib/estimate';
import { useT } from '../lib/i18n';
import { describeRecurrence } from '../lib/recurrence';
import type { SortKey, TaskGroup, TableSort } from '../lib/table';
import { LinkBadge, StatusChip } from './Badge';
import { Checkbox } from './Checkbox';
import { DueLabel } from './DueLabel';
import { PriorityLabel } from './PriorityLabel';

const DASH = '—';

const COLUMNS: ReadonlyArray<{ key: SortKey | null; label: string; srOnly?: boolean }> = [
  { key: null, label: 'Done', srOnly: true },
  { key: 'title', label: 'Task' },
  { key: 'project', label: 'Project' },
  { key: 'milestone', label: 'Milestone' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'due', label: 'Due' },
  { key: 'estimate', label: 'Estimate' },
  { key: 'repeat', label: 'Repeat' },
  { key: 'links', label: 'Links' },
];

/** Unsorted columns show a faint up-down mark so every header reads as sortable. */
function SortIndicator({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  const path = !active
    ? 'M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Zm-3.76 9.2a.75.75 0 0 1 1.06.04l2.7 2.908 2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 0 1 .04-1.06Z'
    : dir === 'asc'
      ? 'M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z'
      : 'M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={cx(
        'ml-1 size-3.5 shrink-0',
        active ? 'text-zinc-700' : 'text-zinc-300 group-hover:text-zinc-500',
      )}
    >
      <path fillRule="evenodd" clipRule="evenodd" d={path} />
    </svg>
  );
}

/**
 * DESIGN §4 DataTable with FR-13 sorting and grouping. Header cells are buttons;
 * `aria-sort` announces the state. Grouping inserts a labelled row, keeping the
 * sorted order inside each group.
 */
export function DataTable({
  groups,
  sort,
  onSort,
  onOpen,
  onToggle,
  footer,
  isPastTarget,
}: {
  groups: TaskGroup[];
  sort: TableSort;
  onSort: (key: SortKey) => void;
  onOpen: (task: Task) => void;
  onToggle: (id: string, done: boolean) => void;
  footer: string;
  /** Highlights tasks that start or are due after the project's target date. */
  isPastTarget?: (task: Task) => boolean;
}) {
  const t = useT();
  const grouped = groups.length > 1 || (groups[0]?.label ?? '') !== '';

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-[13px] font-medium text-zinc-600">
              {COLUMNS.map((column) => {
                const active = column.key !== null && sort.key === column.key;

                return (
                  <th
                    key={column.label}
                    scope="col"
                    aria-sort={
                      column.key === null
                        ? undefined
                        : active
                          ? sort.dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                    }
                    className={column.srOnly ? 'w-10 py-2.5 pl-4' : 'py-2.5 pr-3 font-medium'}
                  >
                    {column.key === null ? (
                      <span className="sr-only">{t(column.label)}</span>
                    ) : (
                      <button
                        type="button"
                        title={t('Sort by {field}', { field: t(column.label) })}
                        className={cx(
                          'group -mx-1.5 inline-flex cursor-pointer items-center rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900',
                          active ? 'text-zinc-900' : 'text-zinc-600',
                        )}
                        onClick={() => {
                          onSort(column.key as SortKey);
                        }}
                      >
                        {t(column.label)}
                        <SortIndicator active={active} dir={sort.dir} />
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => (
              <Fragment key={group.key}>
                {grouped && (
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <td
                      colSpan={COLUMNS.length}
                      className="px-4 py-1.5 text-xs font-medium text-zinc-500"
                    >
                      {t(group.label)}
                      <span className="ml-2 text-zinc-500">{group.tasks.length}</span>
                    </td>
                  </tr>
                )}

                {group.tasks.map((task) => {
                  const pastTarget = isPastTarget?.(task) ?? false;
                  return (
                    <tr
                      key={task.id}
                      className={cx(
                        'h-12 border-b border-zinc-100 last:border-b-0',
                        pastTarget && 'bg-red-50',
                        task.statusCategory === 'done' &&
                          'animate-[task-fade-out_3s_ease-in_forwards] motion-reduce:animate-none',
                      )}
                    >
                      <td className="py-1 pl-4">
                        <Checkbox
                          checked={task.statusCategory === 'done'}
                          label={
                            task.statusCategory === 'done'
                              ? t('Mark "{title}" as not done', { title: task.title })
                              : t('Mark "{title}" as done', { title: task.title })
                          }
                          onChange={(done) => {
                            onToggle(task.id, done);
                          }}
                        />
                      </td>

                      <td className="py-1 pr-3">
                        <button
                          type="button"
                          data-task-id={task.id}
                          className={
                            task.statusCategory === 'done'
                              ? 'text-left text-sm text-zinc-500 line-through'
                              : pastTarget
                                ? 'text-left text-sm font-semibold text-red-700'
                                : 'text-left text-sm text-zinc-900'
                          }
                          onClick={() => {
                            onOpen(task);
                          }}
                        >
                          {task.title}
                          {pastTarget && (
                            <span className="sr-only"> ({t('After the project target date')})</span>
                          )}
                        </button>
                      </td>

                      <td className="py-1 pr-3 text-[13px] text-zinc-600">
                        {task.projectName ?? <span className="text-zinc-500">{t('Inbox')}</span>}
                      </td>

                      <td className="py-1 pr-3 text-[13px] text-zinc-600">
                        {task.milestoneName ?? DASH}
                      </td>

                      <td className="py-1 pr-3">
                        <StatusChip>{task.statusName}</StatusChip>
                      </td>

                      <td className="py-1 pr-3">
                        <PriorityLabel priority={task.priority} />
                      </td>

                      <td className="py-1 pr-3">
                        {task.dueDate ? (
                          <DueLabel
                            dueDate={task.dueDate}
                            dueTime={task.dueTime}
                            variant="table"
                            isDone={task.statusCategory === 'done'}
                          />
                        ) : (
                          <span className="text-xs text-zinc-500">{DASH}</span>
                        )}
                      </td>

                      <td className="py-1 pr-3 text-[13px] text-zinc-600">
                        {formatEstimate(task.estimateMinutes) ?? DASH}
                      </td>

                      <td className="py-1 pr-3 text-[13px] text-zinc-600">
                        {describeRecurrence(task.recurrenceRule) ?? DASH}
                      </td>

                      <td className="py-1 pr-4">
                        {task.link ? (
                          <LinkBadge href={task.link.url}>{task.link.label}</LinkBadge>
                        ) : (
                          <span className="text-xs text-zinc-500">{DASH}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">{footer}</p>
    </div>
  );
}
