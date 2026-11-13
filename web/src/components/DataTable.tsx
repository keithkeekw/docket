import type { Task } from '@app/shared';
import { Fragment } from 'react';
import { formatEstimate } from '../lib/estimate';
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

function SortIndicator({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return null;

  return (
    <span aria-hidden="true" className="ml-1 text-zinc-500">
      {dir === 'asc' ? '↑' : '↓'}
    </span>
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
}: {
  groups: TaskGroup[];
  sort: TableSort;
  onSort: (key: SortKey) => void;
  onOpen: (task: Task) => void;
  onToggle: (id: string, done: boolean) => void;
  footer: string;
}) {
  const grouped = groups.length > 1 || (groups[0]?.label ?? '') !== '';

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="overflow-x-auto">
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
                      <span className="sr-only">{column.label}</span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center font-medium text-zinc-600"
                        onClick={() => {
                          onSort(column.key as SortKey);
                        }}
                      >
                        {column.label}
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
                      {group.label}
                      <span className="ml-2 text-zinc-500">{group.tasks.length}</span>
                    </td>
                  </tr>
                )}

                {group.tasks.map((task) => (
                  <tr key={task.id} className="h-12 border-b border-zinc-100 last:border-b-0">
                    <td className="py-1 pl-4">
                      <Checkbox
                        checked={task.statusCategory === 'done'}
                        label={
                          task.statusCategory === 'done'
                            ? `Mark "${task.title}" as not done`
                            : `Mark "${task.title}" as done`
                        }
                        onChange={(done) => {
                          onToggle(task.id, done);
                        }}
                      />
                    </td>

                    <td className="py-1 pr-3">
                      <button
                        type="button"
                        className={
                          task.statusCategory === 'done'
                            ? 'text-left text-sm text-zinc-500 line-through'
                            : 'text-left text-sm text-zinc-900'
                        }
                        onClick={() => {
                          onOpen(task);
                        }}
                      >
                        {task.title}
                      </button>
                    </td>

                    <td className="py-1 pr-3 text-[13px] text-zinc-600">
                      {task.projectName ?? <span className="text-zinc-500">Inbox</span>}
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
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">{footer}</p>
    </div>
  );
}
