import {
  MAX_ATTACHMENT_BYTES,
  type ChecklistItem,
  type Priority,
  type TaskAttachment,
  type TaskDetail,
  type TaskLink,
  type UpdateTaskBody,
} from '@app/shared';
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from 'react';

import { useNavSummary } from '../api/nav';
import { useMilestones } from '../api/projects';
import { useStatuses } from '../api/statuses';
import {
  useAddAttachment,
  useAddChecklistItem,
  useAddLink,
  useDeleteAttachment,
  useDeleteChecklistItem,
  useDeleteLink,
  useGenerateChecklist,
  useSetTaskTags,
  useTaskDetail,
  useTags,
  useUpdateChecklistItem,
} from '../api/taskDetail';
import { useDeleteTask, useUpdateTask } from '../api/tasks';
import { cx } from '../lib/cx';
import { loadMarkdownEditor } from '../lib/deferredChunks';
import { useT } from '../lib/i18n';
import { recurrenceOptions } from '../lib/recurrence';
import { confirmAction } from '../store/confirm';
import { useUiStore } from '../store/ui';
import { LinkBadge } from './Badge';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { DatePicker } from './DatePicker';
import { Field, Input, Select } from './Field';
import { InlineError } from './InlineError';
import { Kbd } from './Kbd';

const MarkdownEditor = lazy(async () => ({ default: (await loadMarkdownEditor()).MarkdownEditor }));

/** Same footprint as the editor, so the drawer doesn't jump when it arrives. */
function NotesPlaceholder() {
  return <div className="min-h-[122px] rounded-[10px] border border-zinc-200 bg-white" />;
}

type FormState = {
  title: string;
  notes: string;
  statusId: string;
  priority: Priority;
  startDate: string;
  endDate: string;
  dueDate: string;
  dueTime: string;
  estimateMinutes: string;
  projectId: string;
  milestoneId: string;
  recurrenceRule: string;
};

function toForm(task: TaskDetail): FormState {
  return {
    title: task.title,
    notes: task.notes ?? '',
    statusId: task.statusId,
    priority: task.priority,
    startDate: task.startDate ?? '',
    endDate: task.endDate ?? '',
    dueDate: task.dueDate ?? '',
    dueTime: task.dueTime ?? '',
    estimateMinutes: task.estimateMinutes === null ? '' : String(task.estimateMinutes),
    projectId: task.projectId ?? '',
    milestoneId: task.milestoneId ?? '',
    recurrenceRule: task.recurrenceRule ?? '',
  };
}

/** Only changed fields are sent, so a PATCH stays a true patch. */
function toPatch(task: TaskDetail, form: FormState): UpdateTaskBody {
  const patch: UpdateTaskBody = {};

  const title = form.title.trim();
  if (title !== task.title) patch.title = title;

  const notes = form.notes.trim() === '' ? null : form.notes;
  if (notes !== (task.notes ?? null)) patch.notes = notes;

  if (form.statusId !== task.statusId) patch.statusId = form.statusId;
  if (form.priority !== task.priority) patch.priority = form.priority;

  const startDate = form.startDate === '' ? null : form.startDate;
  if (startDate !== task.startDate) patch.startDate = startDate;
  const endDate = form.endDate === '' ? null : form.endDate;
  if (endDate !== task.endDate) patch.endDate = endDate;

  const dueDate = form.dueDate === '' ? null : form.dueDate;
  if (dueDate !== task.dueDate) patch.dueDate = dueDate;

  // A time without a date has nowhere to display, so it is dropped.
  const dueTime = dueDate === null || form.dueTime === '' ? null : form.dueTime;
  if (dueTime !== task.dueTime) patch.dueTime = dueTime;

  const estimate = form.estimateMinutes.trim() === '' ? null : Number(form.estimateMinutes);
  if (estimate !== task.estimateMinutes) patch.estimateMinutes = estimate;

  const rule = form.recurrenceRule === '' ? null : form.recurrenceRule;
  if (rule !== task.recurrenceRule) patch.recurrenceRule = rule;

  const projectId = form.projectId === '' ? null : form.projectId;
  const milestoneId = form.milestoneId === '' ? null : form.milestoneId;
  if (projectId !== task.projectId || milestoneId !== task.milestoneId) {
    patch.projectId = projectId;
    patch.milestoneId = milestoneId;
  }

  return patch;
}

/**
 * DESIGN §5.5 task detail: a 420 px right drawer with every field, checklist
 * and links. A native `<dialog>` handles the focus trap, Esc and the backdrop
 * (D26); the fields load from `GET /api/tasks/:id` (D28).
 */
export function TaskDrawer() {
  const t = useT();
  const drawerTask = useUiStore((state) => state.drawerTask);
  const closeTask = useUiStore((state) => state.closeTask);
  const showUndo = useUiStore((state) => state.showUndo);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const seededRef = useRef<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detail = useTaskDetail(drawerTask?.id ?? null);
  const task = detail.data ?? null;
  const taskId = drawerTask?.id ?? '';

  const { data: statusData } = useStatuses();
  const nav = useNavSummary();
  const projects = nav.data?.projects ?? [];
  const milestones = useMilestones(form?.projectId || undefined);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const isOpen = drawerTask !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Seed once per task so a background refetch cannot wipe typing.
  useEffect(() => {
    if (!task || seededRef.current === task.id) return;

    seededRef.current = task.id;
    setForm(toForm(task));
    setError(null);
  }, [task]);

  useEffect(() => {
    if (!isOpen) seededRef.current = null;
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !form) return;

    if (form.title.trim() === '') {
      setError(t('A task needs a title.'));
      return;
    }

    if (form.startDate !== '' && form.endDate !== '' && form.endDate < form.startDate) {
      setError(t('End date cannot be before the start date.'));
      return;
    }

    const estimate = form.estimateMinutes.trim();
    if (estimate !== '' && (!Number.isInteger(Number(estimate)) || Number(estimate) <= 0)) {
      setError(t('Estimate must be a whole number of minutes.'));
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
      setError(cause instanceof Error ? cause.message : t('Could not save the task'));
    }
  }

  async function handleDelete() {
    if (!task) return;

    const confirmed = await confirmAction({
      title: t('Delete Task'),
      message: t('“{title}” and its checklist, links, files and tags will be deleted.', {
        title: task.title,
      }),
      confirmLabel: t('Delete Task'),
    });
    if (!confirmed) return;

    try {
      await deleteTask.mutateAsync({ id: task.id });
      showUndo(t('Task “{title}” deleted', { title: task.title }));
      closeTask();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not delete the task'));
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeTask();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-drawer-title"
      className="fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-[520px] max-w-[calc(100vw-2rem)] rounded-none border-0 border-l border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
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
              {t('Task')}
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {task?.projectName ?? t('Inbox')}
              {task?.milestoneId && milestones.data
                ? ` · ${milestones.data.milestones.find((m) => m.id === task.milestoneId)?.name ?? ''}`
                : ''}
            </p>
          </div>
          <Button onClick={closeTask}>{t('Close')}</Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {detail.isLoading && <p className="text-sm text-zinc-500">{t('Loading…')}</p>}

          {detail.error && (
            <InlineError
              message={detail.error.message}
              onRetry={() => {
                void detail.refetch();
              }}
            />
          )}

          {form && task && (
            <>
              <form id="task-drawer-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label={t('Title')}>
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
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-zinc-500">{t('Notes')}</span>
                      <Suspense fallback={<NotesPlaceholder />}>
                        <MarkdownEditor
                          key={task.id}
                          value={form.notes}
                          onChange={(notes) => {
                            setForm({ ...form, notes });
                          }}
                          placeholder={t('Add notes… Markdown works as you type.')}
                        />
                      </Suspense>
                      <span className="text-[11px] text-zinc-500">
                        {t('Markdown is formatted inside the box as you type.')}
                      </span>
                    </div>
                  </div>

                  <Field label={t('Project')}>
                    <Select
                      value={form.projectId}
                      onChange={(event) => {
                        // A milestone belongs to its project, so it resets.
                        setForm({ ...form, projectId: event.target.value, milestoneId: '' });
                      }}
                    >
                      <option value="">{t('Inbox')}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                      {form.projectId !== '' && !projects.some((p) => p.id === form.projectId) && (
                        <option value={form.projectId}>
                          {task.projectName ?? t('Current Project')}
                        </option>
                      )}
                    </Select>
                  </Field>

                  <Field label={t('Milestone')}>
                    <Select
                      value={form.milestoneId}
                      disabled={form.projectId === ''}
                      onChange={(event) => {
                        setForm({ ...form, milestoneId: event.target.value });
                      }}
                    >
                      <option value="">{t('None')}</option>
                      {(milestones.data?.milestones ?? []).map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.name}
                        </option>
                      ))}
                      {form.milestoneId !== '' &&
                        task.milestoneName &&
                        !(milestones.data?.milestones ?? []).some(
                          (milestone) => milestone.id === form.milestoneId,
                        ) && <option value={form.milestoneId}>{task.milestoneName}</option>}
                    </Select>
                  </Field>

                  <Field label={t('Status')}>
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

                  <Field label={t('Priority')}>
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

                  <Field label={t('Start Date')}>
                    <DatePicker
                      value={form.startDate}
                      max={form.endDate || undefined}
                      onChange={(startDate) => {
                        setForm({ ...form, startDate });
                      }}
                    />
                  </Field>

                  <Field label={t('End Date')}>
                    <DatePicker
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={(endDate) => {
                        setForm({ ...form, endDate });
                      }}
                    />
                  </Field>

                  <Field label={t('Due Date')}>
                    <DatePicker
                      value={form.dueDate}
                      onChange={(dueDate) => {
                        setForm({ ...form, dueDate });
                      }}
                    />
                  </Field>

                  <Field label={t('Due Time')}>
                    <Input
                      type="time"
                      value={form.dueTime}
                      disabled={form.dueDate === ''}
                      onChange={(event) => {
                        setForm({ ...form, dueTime: event.target.value });
                      }}
                    />
                  </Field>

                  <Field label={t('Estimate (Minutes)')} hint={t('Blank means no estimate.')}>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={form.estimateMinutes}
                      onChange={(event) => {
                        setForm({ ...form, estimateMinutes: event.target.value });
                      }}
                    />
                  </Field>

                  <Field label={t('Repeat')} hint={t("Weekly repeats on the due date's weekday.")}>
                    <Select
                      value={form.recurrenceRule}
                      onChange={(event) => {
                        setForm({ ...form, recurrenceRule: event.target.value });
                      }}
                    >
                      {recurrenceOptions(form.recurrenceRule || null).map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.label)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </form>

              <ChecklistSection taskId={taskId} items={task.checklistItems} />
              <LinksSection taskId={taskId} links={task.links} />
              <TagsSection taskId={taskId} tags={task.tags} />
              <AttachmentsSection taskId={taskId} attachments={task.attachments} />

              {error && <InlineError message={error} />}

              <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
                <Kbd>Esc</Kbd> {t('to close')}
              </p>
            </>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                void handleDelete();
              }}
              disabled={!task || deleteTask.isPending}
            >
              {deleteTask.isPending ? t('Deleting…') : t('Delete')}
            </Button>
          </div>

          <Button
            type="submit"
            form="task-drawer-form"
            variant="primary"
            disabled={!form || updateTask.isPending}
          >
            {updateTask.isPending ? t('Saving…') : t('Save')}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}

function SectionHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-xs font-medium text-zinc-500">{title}</h3>
      {meta && <span className="text-xs text-zinc-500">{meta}</span>}
    </div>
  );
}

function ChecklistSection({ taskId, items }: { taskId: string; items: ChecklistItem[] }) {
  const t = useT();
  const addItem = useAddChecklistItem(taskId);
  const updateItem = useUpdateChecklistItem(taskId);
  const deleteItem = useDeleteChecklistItem(taskId);
  const generate = useGenerateChecklist(taskId);
  const [title, setTitle] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);

  const done = items.filter((item) => item.done).length;

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    await addItem.mutateAsync({ title: trimmed });
    setTitle('');
  }

  async function handleGenerate() {
    setGenerateError(null);
    try {
      const result = await generate.mutateAsync();
      for (const itemTitle of result.items) {
        await addItem.mutateAsync({ title: itemTitle });
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : t('Generation failed'));
    }
  }

  async function removeItem(item: ChecklistItem) {
    const confirmed = await confirmAction({
      title: t('Delete Checklist Item'),
      message: t('“{title}” will be removed from this checklist.', { title: item.title }),
      confirmLabel: t('Delete Item'),
    });
    if (!confirmed) return;

    setGenerateError(null);
    try {
      await deleteItem.mutateAsync({ id: item.id });
    } catch (cause) {
      setGenerateError(cause instanceof Error ? cause.message : t('Could not delete the item'));
    }
  }

  return (
    <section className="mt-5 border-t border-zinc-100 pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium text-zinc-500">
          {t('Checklist')}{' '}
          <span className="font-normal">
            {t('{count} of {total}', { count: done, total: items.length })}
          </span>
        </h3>
        <button
          type="button"
          disabled={generate.isPending || addItem.isPending}
          onClick={() => {
            void handleGenerate();
          }}
          title={t(
            'Uses the task title, notes and readable attachments (txt, md, csv, json, doc, docx). File text is sent to your AI provider.',
          )}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">✦</span>
          {generate.isPending ? t('Generating…') : t('Auto-Generate')}
        </button>
      </div>
      {generateError && <p className="mt-1 text-xs text-red-600">{generateError}</p>}

      {items.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex min-h-8 items-center gap-2">
              <Checkbox
                checked={item.done}
                label={t(item.done ? 'Mark "{title}" as not done' : 'Mark "{title}" as done', {
                  title: item.title,
                })}
                onChange={(checked) => {
                  void updateItem.mutateAsync({ id: item.id, done: checked });
                }}
              />
              <span
                className={cx(
                  'min-w-0 flex-1 text-sm',
                  item.done ? 'text-zinc-500 line-through' : 'text-zinc-900',
                )}
              >
                {item.title}
              </span>
              <button
                type="button"
                aria-label={t('Delete checklist item {title}', { title: item.title })}
                className="text-red-800 opacity-40 transition-opacity hover:opacity-100"
                onClick={() => {
                  void removeItem(item);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="mt-2 flex items-end gap-2" onSubmit={handleAdd}>
        <div className="flex-1">
          <Field label={t('Add Checklist Item')}>
            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
            />
          </Field>
        </div>
        <Button type="submit" disabled={!title.trim()}>
          {t('Add')}
        </Button>
      </form>
    </section>
  );
}

function LinksSection({ taskId, links }: { taskId: string; links: TaskLink[] }) {
  const t = useT();
  const addLink = useAddLink(taskId);
  const deleteLink = useDeleteLink(taskId);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) return;

    try {
      await addLink.mutateAsync({ url: url.trim(), label: label.trim() || undefined });
      setUrl('');
      setLabel('');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not add the link'));
    }
  }

  async function removeLink(link: TaskLink) {
    const confirmed = await confirmAction({
      title: t('Delete Link'),
      message: t('“{label}” will be removed from this task.', { label: link.label }),
      confirmLabel: t('Delete Link'),
    });
    if (!confirmed) return;

    setError(null);
    try {
      await deleteLink.mutateAsync({ id: link.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not remove the link'));
    }
  }

  return (
    <section className="mt-5 border-t border-zinc-100 pt-4">
      <SectionHeading title={t('Links')} />

      {links.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.id} className="flex min-h-8 items-center gap-2">
              <LinkBadge href={link.url}>{link.label}</LinkBadge>
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{link.url}</span>
              <button
                type="button"
                aria-label={t('Remove link {label}', { label: link.label })}
                className="text-xs text-zinc-500 underline underline-offset-2"
                onClick={() => {
                  void removeLink(link);
                }}
              >
                {t('Remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="mt-2 flex flex-col gap-2" onSubmit={handleAdd}>
        <Field label={t('Link URL')}>
          <Input
            type="url"
            placeholder="https://"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
          />
        </Field>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label={t('Badge Label')} hint={t('Blank derives it from the URL.')}>
              <Input
                value={label}
                onChange={(event) => {
                  setLabel(event.target.value);
                }}
              />
            </Field>
          </div>
          <Button type="submit" disabled={!url.trim() || addLink.isPending}>
            {t('Add Link')}
          </Button>
        </div>
      </form>

      {error && <InlineError message={error} />}
    </section>
  );
}

function TagsSection({ taskId, tags }: { taskId: string; tags: string[] }) {
  const t = useT();
  const setTags = useSetTaskTags(taskId);
  const known = useTags();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function removeTag(tag: string) {
    const confirmed = await confirmAction({
      title: t('Remove Tag'),
      message: t('“{tag}” will be removed from this task.', { tag }),
      confirmLabel: t('Remove Tag'),
    });
    if (!confirmed) return;

    setError(null);
    try {
      await setTags.mutateAsync({ tags: tags.filter((entry) => entry !== tag) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not remove the tag'));
    }
  }

  async function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setName('');
      return;
    }

    await setTags.mutateAsync({ tags: [...tags, trimmed] });
    setName('');
  }

  return (
    <section className="mt-5 border-t border-zinc-100 pt-4">
      <SectionHeading title={t('Tags')} />

      {tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
            >
              {tag}
              <button
                type="button"
                aria-label={t('Remove tag {tag}', { tag })}
                className="text-zinc-500"
                onClick={() => {
                  void removeTag(tag);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="mt-2 flex items-end gap-2" onSubmit={addTag}>
        <div className="flex-1">
          <Field label={t('Add Tag')} hint={t('Tags are created on the fly.')}>
            <Input
              list="task-drawer-tags"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </Field>
        </div>
        <datalist id="task-drawer-tags">
          {(known.data?.tags ?? []).map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
        </datalist>
        <Button type="submit" disabled={!name.trim()}>
          {t('Add')}
        </Button>
      </form>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentsSection({
  taskId,
  attachments,
}: {
  taskId: string;
  attachments: TaskAttachment[];
}) {
  const t = useT();
  const addAttachment = useAddAttachment(taskId);
  const deleteAttachment = useDeleteAttachment(taskId);
  const [error, setError] = useState<string | null>(null);

  const limitMb = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    try {
      for (const file of files) {
        await addAttachment.mutateAsync(file);
      }
      event.target.value = '';
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not upload the file'));
    }
  }

  async function removeAttachment(id: string, filename: string) {
    const confirmed = await confirmAction({
      title: t('Delete File'),
      message: t('“{filename}” will be permanently deleted from this task.', { filename }),
      confirmLabel: t('Delete File'),
    });
    if (!confirmed) return;

    setError(null);
    try {
      await deleteAttachment.mutateAsync({ id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not remove the file'));
    }
  }

  return (
    <section className="mt-5 border-t border-zinc-100 pt-4">
      <SectionHeading
        title={t('Attachments')}
        meta={attachments.length > 0 ? String(attachments.length) : undefined}
      />

      {attachments.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex min-h-8 items-center gap-2">
              <a
                href={`/api/attachments/${attachment.id}/download`}
                download={attachment.filename}
                className="min-w-0 flex-1 truncate text-xs text-blue-700 underline underline-offset-2"
              >
                {attachment.filename}
              </a>
              <span className="shrink-0 text-xs text-zinc-500">
                {formatFileSize(attachment.sizeBytes)}
              </span>
              <button
                type="button"
                aria-label={t('Remove {filename}', { filename: attachment.filename })}
                className="shrink-0 text-xs text-zinc-500 underline underline-offset-2"
                onClick={() => {
                  void removeAttachment(attachment.id, attachment.filename);
                }}
              >
                {t('Remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2">
        <Field label={t('File Upload')} hint={t('Up to {size} MB per file.', { size: limitMb })}>
          <input
            type="file"
            multiple
            disabled={addAttachment.isPending}
            onChange={(event) => {
              void uploadFiles(event);
            }}
            className="block w-full text-xs text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 disabled:opacity-50"
          />
        </Field>
      </div>

      {addAttachment.isPending && <p className="mt-1 text-xs text-zinc-500">{t('Uploading…')}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </section>
  );
}
