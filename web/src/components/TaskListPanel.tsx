import type { Task } from '@app/shared';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, type ReactNode } from 'react';
import { useBulkDeleteTasks, useReorderTasks, useUpdateTask } from '../api/tasks';
import { pickTopTasks } from '../lib/autoAssign';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { moveItem } from '../lib/moveItem';
import { toTaskRow } from '../lib/taskRow';
import { localDateString } from '../lib/today';
import { confirmAction } from '../store/confirm';
import { useUiStore } from '../store/ui';
import { EmptyState } from './EmptyState';
import { GroupHeader } from './GroupHeader';
import { InlineError } from './InlineError';
import { PrelineTooltip } from './PrelineTooltip';
import { TaskRow } from './TaskRow';

export type TaskGroup = {
  label: string;
  tone?: 'default' | 'overdue';
  tasks: Task[];
};

/**
 * List view shared by Inbox, Today, All tasks and a project (DESIGN §5.5).
 * Rows drag to set their manual order; Select Tasks turns the completion
 * checkboxes into selection checkboxes for a bulk delete (FR-29).
 */
export function TaskListPanel({
  groups,
  isLoading = false,
  error,
  onRetry,
  emptyMessage,
  onOpen,
  onToggle,
  autoAssign = false,
  viewSwitcher,
  isPastTarget,
}: {
  groups: TaskGroup[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage: string;
  onOpen: (task: Task) => void;
  onToggle: (id: string, done: boolean) => void;
  /** Show the Auto-Assign Top 3 action (All Tasks and Inbox). */
  autoAssign?: boolean;
  /** View control rendered beside the selection actions. */
  viewSwitcher?: ReactNode;
  /** Highlights tasks that start or are due after the project's target date. */
  isPastTarget?: (task: Task) => boolean;
}) {
  const bulkDelete = useBulkDeleteTasks();
  const reorder = useReorderTasks();
  const updateTask = useUpdateTask();
  const showUndo = useUiStore((state) => state.showUndo);
  const t = useT();

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignMessage, setAutoAssignMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const switcherRow = viewSwitcher ? (
    <div className="mt-6 flex justify-end">{viewSwitcher}</div>
  ) : null;

  if (isLoading) {
    return (
      <>
        {switcherRow}
        <p className="mt-2 text-sm text-zinc-500">{t('Loading…')}</p>
      </>
    );
  }

  if (error) {
    return (
      <>
        {switcherRow}
        <InlineError message={error} onRetry={onRetry} />
      </>
    );
  }

  const visible = groups.filter((group) => group.tasks.length > 0);

  if (visible.length === 0) {
    return (
      <>
        {switcherRow}
        <EmptyState message={emptyMessage} />
      </>
    );
  }

  const allTasks = visible.flatMap((group) => group.tasks);
  const selectedCount = allTasks.filter((task) => selected.has(task.id)).length;

  function cancelSelection() {
    setSelecting(false);
    setSelected(new Set());
    setActionError(null);
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function deleteSelected() {
    const ids = allTasks.filter((task) => selected.has(task.id)).map((task) => task.id);
    if (ids.length === 0) return;

    const confirmed = await confirmAction({
      title: t('Delete Selected Tasks'),
      message: t(
        ids.length === 1
          ? '{count} selected task will be deleted.'
          : '{count} selected tasks will be deleted.',
        { count: ids.length },
      ),
      confirmLabel: t('Delete Tasks'),
    });
    if (!confirmed) return;

    setActionError(null);
    try {
      const result = await bulkDelete.mutateAsync({ ids });
      cancelSelection();
      showUndo(
        t(result.deleted === 1 ? '{count} task deleted' : '{count} tasks deleted', {
          count: result.deleted,
        }),
      );
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t('Could not delete the tasks'));
    }
  }

  async function autoAssignTopThree() {
    setActionError(null);
    setAutoAssignMessage(null);

    const targets = pickTopTasks(allTasks, 3);
    if (targets.length === 0) {
      setAutoAssignMessage(t('No open tasks to assign.'));
      return;
    }

    setAutoAssigning(true);
    const today = localDateString();

    try {
      for (const task of targets) {
        if (task.dueDate !== today) {
          await updateTask.mutateAsync({ id: task.id, dueDate: today });
        }
      }
      setAutoAssignMessage(
        t(targets.length === 1 ? '{count} task set for today.' : '{count} tasks set for today.', {
          count: targets.length,
        }),
      );
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t('Could not assign tasks to today'));
    } finally {
      setAutoAssigning(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    const group = visible.find((entry) => entry.tasks.some((task) => task.id === activeId));
    if (!group) return;

    const oldIndex = group.tasks.findIndex((task) => task.id === activeId);
    const newIndex = group.tasks.findIndex((task) => task.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = moveItem(group.tasks, oldIndex, newIndex);
    setActionError(null);
    reorder.mutate(
      { ids: next.map((task) => task.id) },
      {
        onError: (cause) => {
          setActionError(cause instanceof Error ? cause.message : t('Could not reorder the tasks'));
        },
      },
    );
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        {actionError && <span className="mr-auto text-xs text-red-600">{actionError}</span>}
        {autoAssignMessage && !actionError && (
          <span className="mr-auto text-xs text-emerald-700">{autoAssignMessage}</span>
        )}
        {viewSwitcher}

        {selecting ? (
          <>
            <span className="text-xs text-zinc-600">
              {t('{count} selected', { count: selectedCount })}
            </span>
            <PrelineTooltip label={bulkDelete.isPending ? t('Deleting…') : t('Delete Selected')}>
              <button
                type="button"
                onClick={() => {
                  void deleteSelected();
                }}
                disabled={selectedCount === 0 || bulkDelete.isPending}
                aria-label={bulkDelete.isPending ? t('Deleting…') : t('Delete Selected')}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={cx(
                    'size-4',
                    bulkDelete.isPending && 'animate-pulse motion-reduce:animate-none',
                  )}
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </PrelineTooltip>
            <PrelineTooltip label={t('Cancel')}>
              <button
                type="button"
                onClick={cancelSelection}
                aria-label={t('Cancel')}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </PrelineTooltip>
          </>
        ) : (
          <>
            {autoAssign && (
              <PrelineTooltip label={t('Auto-Assign Top 3')}>
                <button
                  type="button"
                  onClick={() => {
                    void autoAssignTopThree();
                  }}
                  disabled={autoAssigning || allTasks.length === 0}
                  aria-label={t('Auto-Assign Top 3')}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={cx(
                      'size-4',
                      autoAssigning && 'animate-pulse motion-reduce:animate-none',
                    )}
                    aria-hidden="true"
                  >
                    <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633l-.683-2.051ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                  </svg>
                </button>
              </PrelineTooltip>
            )}

            <PrelineTooltip label={t('Select Tasks')}>
              <button
                type="button"
                onClick={() => {
                  setSelecting(true);
                }}
                disabled={allTasks.length === 0}
                aria-label={t('Select Tasks')}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="size-4"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="14" height="14" rx="2.5" />
                  <path d="m6.5 10 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </PrelineTooltip>
          </>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white pb-1">
          {visible.map((group) => (
            <section key={group.label}>
              <GroupHeader label={t(group.label)} count={group.tasks.length} tone={group.tone} />
              <ul>
                {group.tasks.map((task) => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    dragDisabled={selecting}
                    selecting={selecting}
                    selected={selected.has(task.id)}
                    onSelect={(checked) => {
                      toggleSelected(task.id, checked);
                    }}
                    onOpen={() => {
                      onOpen(task);
                    }}
                    onToggle={(done) => {
                      onToggle(task.id, done);
                    }}
                    pastTarget={isPastTarget?.(task) ?? false}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DndContext>
    </>
  );
}

function SortableTaskRow({
  task,
  dragDisabled,
  selecting,
  selected,
  onSelect,
  onOpen,
  onToggle,
  pastTarget,
}: {
  task: Task;
  dragDisabled: boolean;
  selecting: boolean;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onOpen: () => void;
  onToggle: (done: boolean) => void;
  pastTarget: boolean;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: dragDisabled,
  });
  const { setNodeRef: setDropRef } = useDroppable({ id: task.id, disabled: dragDisabled });

  function setRef(node: HTMLLIElement | null) {
    setNodeRef(node);
    setDropRef(node);
  }

  return (
    <TaskRow
      task={toTaskRow(task)}
      onOpen={onOpen}
      onToggle={onToggle}
      fadeOnComplete
      pastTarget={pastTarget}
      selectable={selecting}
      selected={selected}
      onSelect={onSelect}
      rowRef={setRef}
      rowStyle={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      isDragging={isDragging}
      dragHandle={
        dragDisabled ? undefined : (
          <PrelineTooltip label={t('Drag to Reorder')}>
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={t('Reorder {title}', { title: task.title })}
              className="mt-0.5 flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-zinc-400 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3.5"
                aria-hidden="true"
              >
                <circle cx="6" cy="4" r="1" />
                <circle cx="10" cy="4" r="1" />
                <circle cx="6" cy="8" r="1" />
                <circle cx="10" cy="8" r="1" />
                <circle cx="6" cy="12" r="1" />
                <circle cx="10" cy="12" r="1" />
              </svg>
            </button>
          </PrelineTooltip>
        )
      }
    />
  );
}
