import type { Task } from '@app/shared';
import { formatEstimate } from '../lib/estimate';
import { LinkBadge, StatusChip } from './Badge';
import { Checkbox } from './Checkbox';
import { DueLabel } from './DueLabel';
import { PriorityLabel } from './PriorityLabel';

const DASH = '—';

/**
 * DESIGN §4 DataTable: white panel, horizontal scroll, 13 px / 500 header,
 * 48 px rows, columns exactly as specified. Sorting and grouping are M4 (FR-13).
 */
export function DataTable({
  tasks,
  onOpen,
  onToggle,
  footer,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (id: string, done: boolean) => void;
  footer: string;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-[13px] font-medium text-zinc-600">
              <th scope="col" className="w-10 py-2.5 pl-4">
                <span className="sr-only">Done</span>
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                Task
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                Project
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                Milestone
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                Status
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                Priority
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                Due
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                Estimate
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                Repeat
              </th>
              <th scope="col" className="py-2.5 pr-4 font-medium">
                Links
              </th>
            </tr>
          </thead>

          <tbody>
            {tasks.map((task) => (
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
                  {task.recurrenceRule ? 'Recurring' : DASH}
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
          </tbody>
        </table>
      </div>

      <p className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">{footer}</p>
    </div>
  );
}
