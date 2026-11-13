import type { Priority, Task, UpdateTaskBody } from '@app/shared';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { useStatuses } from '../api/statuses';
import { useDeleteTask, useUpdateTask } from '../api/tasks';
import { useUiStore } from '../store/ui';
import { Button } from './Button';
import { Field, Input, Select, Textarea } from './Field';
import { InlineError } from './InlineError';
import { Kbd } from './Kbd';

type FormState = {
  title: string;
  notes: string;
  statusId: string;
  priority: Priority;
  dueDate: string;
  dueTime: string;
  estimateMinutes: string;
};

function toForm(task: Task): FormState {
  return {
    title: task.title,
    notes: task.notes ?? '',
    statusId: task.statusId,
    priority: task.priority,
    dueDate: task.dueDate ?? '',
    dueTime: task.dueTime ?? '',
    estimateMinutes: task.estimateMinutes === null ? '' : String(task.estimateMinutes),
  };
}

/** Only changed fields are sent, so a PATCH stays a true patch. */
function toPatch(task: Task, form: FormState): UpdateTaskBody {
  const patch: UpdateTaskBody = {};

  const title = form.title.trim();
  if (title !== task.title) patch.title = title;

  const notes = form.notes.trim() === '' ? null : form.notes;
  if (notes !== (task.notes ?? null)) patch.notes = notes;

  if (form.statusId !== task.statusId) patch.statusId = form.statusId;
  if (form.priority !== task.priority) patch.priority = form.priority;

  const dueDate = form.dueDate === '' ? null : form.dueDate;
  if (dueDate !== task.dueDate) patch.dueDate = dueDate;

  // A time without a date has nowhere to display, so it is dropped.
  const dueTime = dueDate === null || form.dueTime === '' ? null : form.dueTime;
  if (dueTime !== task.dueTime) patch.dueTime = dueTime;

  const estimate =
    form.estimateMinutes.trim() === '' ? null : Number(form.estimateMinutes);
  if (estimate !== task.estimateMinutes) patch.estimateMinutes = estimate;

  return patch;
}

/**
 * DESIGN §5.5 task detail: a 420 px right drawer. M1-S5 covers the plain
 * fields; project, milestone, tags, links and checklist arrive in M1-S6/S7.
 *
 * A native `<dialog>` handles the focus trap, Esc and the backdrop (D26).
 */
export function TaskDrawer() {
  const task = useUiStore((state) => state.drawerTask);
  const closeTask = useUiStore((state) => state.closeTask);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: statusData } = useStatuses();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const isOpen = task !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Re-seed the form whenever a different task is opened.
  useEffect(() => {
    if (!task) return;

    setForm(toForm(task));
    setError(null);
    setConfirmingDelete(false);
  }, [task]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !form) return;

    if (form.title.trim() === '') {
      setError('A task needs a title.');
      return;
    }

    const estimate = form.estimateMinutes.trim();
    if (estimate !== '' && (!Number.isInteger(Number(estimate)) || Number(estimate) <= 0)) {
      setError('Estimate must be a whole number of minutes.');
      return;
    }

    const patch = toPatch(task, form);
    if (Object.keys(patch).length === 0) {
      closeTask();
      return;
    }

    try {
      await updateTask.mutateAsync({ id: task.id, ...patch });
      closeTask();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the task');
    }
  }

  async function handleDelete() {
    if (!task) return;

    try {
      await deleteTask.mutateAsync({ id: task.id });
      closeTask();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the task');
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeTask();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-drawer-title"
      className="fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-[420px] max-w-[calc(100vw-2rem)] rounded-none border-0 border-l border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdropClick}
      onCancel={(event) => {
        event.preventDefault();
        closeTask();
      }}
      onClose={() => {
        if (isOpen) closeTask();
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="task-drawer-title" className="text-[15px] font-semibold text-zinc-900">
              Task
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{task?.projectName ?? 'Inbox'}</p>
          </div>
          <Button onClick={closeTask}>Close</Button>
        </header>

        {form && (
          <form
            id="task-drawer-form"
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Title">
                  <Input
                    autoFocus
                    value={form.title}
                    onChange={(event) => {
                      setForm({ ...form, title: event.target.value });
                    }}
                  />
                </Field>
              </div>

              <div className="col-span-2">
                <Field label="Notes">
                  <Textarea
                    value={form.notes}
                    onChange={(event) => {
                      setForm({ ...form, notes: event.target.value });
                    }}
                  />
                </Field>
              </div>

              <Field label="Status">
                <Select
                  value={form.statusId}
                  onChange={(event) => {
                    setForm({ ...form, statusId: event.target.value });
                  }}
                >
                  {(statusData?.statuses ?? []).map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Priority">
                <Select
                  value={String(form.priority)}
                  onChange={(event) => {
                    setForm({ ...form, priority: Number(event.target.value) as Priority });
                  }}
                >
                  <option value="1">P1</option>
                  <option value="2">P2</option>
                  <option value="3">P3</option>
                </Select>
              </Field>

              <Field label="Due date">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => {
                    setForm({ ...form, dueDate: event.target.value });
                  }}
                />
              </Field>

              <Field label="Due time">
                <Input
                  type="time"
                  value={form.dueTime}
                  disabled={form.dueDate === ''}
                  onChange={(event) => {
                    setForm({ ...form, dueTime: event.target.value });
                  }}
                />
              </Field>

              <Field label="Estimate (minutes)" hint="Blank means no estimate.">
                <Input
                  type="number"
                  min={1}
                  step={5}
                  inputMode="numeric"
                  value={form.estimateMinutes}
                  onChange={(event) => {
                    setForm({ ...form, estimateMinutes: event.target.value });
                  }}
                />
              </Field>
            </div>

            {error && <InlineError message={error} />}

            <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
              <Kbd>Esc</Kbd> to close
            </p>
          </form>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3">
          <div className="flex items-center gap-2">
            {confirmingDelete ? (
              <>
                <Button onClick={handleDelete} disabled={deleteTask.isPending}>
                  {deleteTask.isPending ? 'Deleting…' : 'Confirm delete'}
                </Button>
                <Button
                  onClick={() => {
                    setConfirmingDelete(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setConfirmingDelete(true);
                }}
              >
                Delete
              </Button>
            )}
          </div>

          <Button
            type="submit"
            form="task-drawer-form"
            variant="primary"
            disabled={!form || updateTask.isPending}
          >
            {updateTask.isPending ? 'Saving…' : 'Save'}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
