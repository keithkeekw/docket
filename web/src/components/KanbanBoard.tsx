import type { Status, Task } from '@app/shared';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { useState } from 'react';
import { cx } from '../lib/cx';
import { formatEstimate } from '../lib/estimate';
import { useT } from '../lib/i18n';
import { describeRecurrence } from '../lib/recurrence';
import { LinkBadge } from './Badge';
import { Confetti } from './Confetti';
import { DueLabel } from './DueLabel';
import { PriorityLabel } from './PriorityLabel';

const CATEGORY_LABEL: Record<Status['category'], string> = {
  open: 'Open',
  active: 'Active',
  done: 'Done',
};

/**
 * dnd-kit's default keyboard getter moves 25 px per arrow press, which is
 * useless across a 240 px column. This jumps the overlay to the centre of the
 * neighbouring column instead, so Left/Right is one key per status (NFR-7).
 */
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const { context, currentCoordinates } = args;
  const { collisionRect, droppableContainers } = context;
  const direction = event.code === 'ArrowRight' ? 1 : event.code === 'ArrowLeft' ? -1 : 0;

  if (!direction || !collisionRect) return undefined;

  const columns = droppableContainers
    .getEnabled()
    .map((container) => ({ rect: container.rect.current }))
    .filter((entry) => entry.rect !== null)
    .map((entry) => entry.rect as { left: number; width: number })
    .sort((a, b) => a.left - b.left);

  const centre = collisionRect.left + collisionRect.width / 2;
  const target =
    direction > 0
      ? columns.find((column) => column.left + column.width / 2 > centre + 1)
      : [...columns].reverse().find((column) => column.left + column.width / 2 < centre - 1);

  if (!target) return undefined;

  return {
    x: currentCoordinates.x + (target.left + target.width / 2 - centre),
    y: currentCoordinates.y,
  };
};

/**
 * DESIGN §4 Kanban: columns are the global statuses in order, min 210 px, in a
 * horizontal scroller. Cards drag between columns to change status (FR-12).
 *
 * Keyboard: Space picks a card up, arrows move it, Space drops it; Enter opens
 * the task drawer, whose status select is the other keyboard path (DESIGN §7).
 */
export function KanbanBoard({
  statuses,
  tasks,
  onOpen,
  onStatusChange,
  onAddTask,
  isPastTarget,
}: {
  statuses: Status[];
  tasks: Task[];
  onOpen: (task: Task) => void;
  onStatusChange: (taskId: string, statusId: string) => void;
  onAddTask: (statusId: string) => void;
  /** Highlights tasks that start or are due after the project's target date. */
  isPastTarget?: (task: Task) => boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confettiBurst, setConfettiBurst] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const activeTask = tasks.find((task) => task.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const overId = event.over?.id;
    if (!overId) return;

    const taskId = String(event.active.id);
    const statusId = String(overId);
    const task = tasks.find((entry) => entry.id === taskId);

    if (task && task.statusId !== statusId) {
      onStatusChange(taskId, statusId);

      if (statuses.find((status) => status.id === statusId)?.category === 'done') {
        setConfettiBurst((current) => current + 1);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
      }}
    >
      <div className="mt-6 flex gap-3 overflow-x-auto overscroll-x-contain pb-2">
        {statuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={tasks.filter((task) => task.statusId === status.id)}
            onOpen={onOpen}
            onAddTask={onAddTask}
            draggingId={activeId}
            isPastTarget={isPastTarget}
          />
        ))}
      </div>

      {/* Columns are droppables and much larger than a card; without this the
          overlay is scaled to the column, which makes the card look skewed. */}
      <DragOverlay dropAnimation={null} adjustScale={false}>
        {activeTask ? <CardPreview task={activeTask} /> : null}
      </DragOverlay>

      <Confetti burst={confettiBurst} />
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  onOpen,
  onAddTask,
  draggingId,
  isPastTarget,
}: {
  status: Status;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onAddTask: (statusId: string) => void;
  draggingId: string | null;
  isPastTarget?: (task: Task) => boolean;
}) {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <section className="flex w-[240px] shrink-0 flex-col rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-baseline gap-2 border-b border-zinc-100 px-3 py-2.5">
        <h3 className="text-[13px] font-semibold text-zinc-900">{status.name}</h3>
        <span className="text-xs text-zinc-500">{tasks.length}</span>
        <span className="ml-auto rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-600">
          {t(CATEGORY_LABEL[status.category])}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cx(
          'flex min-h-24 flex-1 flex-col gap-2.5 p-3 transition-colors',
          isOver && 'bg-zinc-50',
        )}
      >
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onOpen={onOpen}
            isDragging={draggingId === task.id}
            pastTarget={isPastTarget?.(task) ?? false}
          />
        ))}

        <button
          type="button"
          className="mt-auto min-h-9 rounded-lg px-2 text-left text-[13px] text-zinc-500"
          onClick={() => {
            onAddTask(status.id);
          }}
        >
          + {t('Add Task')}
        </button>
      </div>
    </section>
  );
}

function KanbanCard({
  task,
  onOpen,
  isDragging,
  pastTarget,
}: {
  task: Task;
  onOpen: (task: Task) => void;
  isDragging: boolean;
  pastTarget: boolean;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id });
  const estimate = formatEstimate(task.estimateMinutes);
  const repeat = describeRecurrence(task.recurrenceRule);
  const done = task.statusCategory === 'done';

  return (
    <div
      ref={setNodeRef}
      className={cx(
        'rounded-[10px] border',
        pastTarget ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white',
        isDragging && 'opacity-40',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        data-task-id={task.id}
        className="w-full rounded-[10px] px-3.5 py-3 text-left"
        onClick={() => {
          onOpen(task);
        }}
      >
        <span
          className={cx(
            'block text-sm leading-snug',
            done
              ? 'text-zinc-500 line-through'
              : pastTarget
                ? 'font-semibold text-red-700'
                : 'text-zinc-900',
          )}
        >
          {task.title}
          {pastTarget && <span className="sr-only"> ({t('After the project target date')})</span>}
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <PriorityLabel priority={task.priority} />
          <DueLabel dueDate={task.dueDate} dueTime={task.dueTime} isDone={done} />
          {estimate && <span title={t('Estimate {value}', { value: estimate })}>{estimate}</span>}
          {repeat && (
            <span title={t('Repeats {label}', { label: t(repeat).toLowerCase() })}>
              <span aria-hidden="true">↻</span> {t(repeat)}
            </span>
          )}
          {task.checklist.total > 0 && (
            <span
              title={t('{done} of {total} checklist items done', {
                done: task.checklist.done,
                total: task.checklist.total,
              })}
            >
              <span aria-hidden="true">☑</span> {task.checklist.done}/{task.checklist.total}
            </span>
          )}
        </span>
      </button>

      {task.link && (
        <div className="px-3.5 pb-3">
          <LinkBadge href={task.link.url}>{task.link.label}</LinkBadge>
        </div>
      )}
    </div>
  );
}

function CardPreview({ task }: { task: Task }) {
  const estimate = formatEstimate(task.estimateMinutes);

  return (
    <div className="w-[216px] rounded-[10px] border border-zinc-200 bg-white px-3.5 py-3 shadow-md">
      <p className="text-sm leading-snug text-zinc-900">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <PriorityLabel priority={task.priority} />
        <DueLabel dueDate={task.dueDate} dueTime={task.dueTime} />
        {estimate && <span>{estimate}</span>}
      </div>
    </div>
  );
}
