import type { Milestone, ProjectSummary } from '@app/shared';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  useCreateMilestone,
  useCreateProject,
  useDeleteProject,
  useMilestones,
  useProject,
  useReorderMilestones,
  useUpdateMilestone,
  useUpdateProject,
} from '../api/projects';
import { confirmAction } from '../store/confirm';
import { useUiStore } from '../store/ui';
import { useT } from '../lib/i18n';
import { moveItem } from '../lib/moveItem';
import { useRemoveMilestone } from '../lib/useRemoveMilestone';
import { Button } from './Button';
import { DatePicker } from './DatePicker';
import { Field, Input, Textarea } from './Field';
import { InlineError } from './InlineError';

type FormState = {
  name: string;
  description: string;
  targetDate: string;
  aiExcluded: boolean;
};

function toForm(project: ProjectSummary): FormState {
  return {
    name: project.name,
    description: project.description,
    targetDate: project.targetDate ?? '',
    aiExcluded: project.aiExcluded,
  };
}

/**
 * Project editor (FR-6) and milestone management (FR-7). DESIGN §5.5 does not
 * mock a projects screen, so create/edit/archive/delete live in this dialog,
 * opened from the sidebar or a project screen (PROGRESS D29).
 */
export function ProjectDialog() {
  const state = useUiStore((store) => store.projectDialog);
  const close = useUiStore((store) => store.closeProjectDialog);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const isOpen = state !== null;

  const projectId = state?.mode === 'edit' ? state.projectId : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="project-dialog-title"
      className="m-auto w-[min(600px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        if (isOpen) close();
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === dialogRef.current) close();
      }}
    >
      {state?.mode === 'create' && <CreateProjectForm onClose={close} />}
      {state?.mode === 'edit' && <EditProjectForm projectId={projectId} onClose={close} />}
    </dialog>
  );
}

function CreateProjectForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    targetDate: '',
    aiExcluded: false,
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError(t('A project needs a name.'));
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        name,
        description: form.description,
        targetDate: form.targetDate === '' ? null : form.targetDate,
      });
      onClose();
      void navigate(`/projects/${project.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not create the project'));
    }
  }

  return (
    <form className="p-5" onSubmit={handleSubmit}>
      <h2 id="project-dialog-title" className="text-[15px] font-semibold text-zinc-900">
        {t('New Project')}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        {t('A project groups related tasks and milestones.')}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <Field label={t('Name')}>
          <Input
            autoFocus
            value={form.name}
            onChange={(event) => {
              setForm({ ...form, name: event.target.value });
              setError(null);
            }}
          />
        </Field>

        <Field label={t('Description')}>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(event) => {
              setForm({ ...form, description: event.target.value });
            }}
          />
        </Field>

        <Field label={t('Target Date')} hint={t('Optional.')}>
          <DatePicker
            value={form.targetDate}
            onChange={(targetDate) => {
              setForm({ ...form, targetDate });
            }}
          />
        </Field>
      </div>

      {error && <InlineError message={error} />}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button type="submit" variant="primary" disabled={createProject.isPending}>
          {createProject.isPending ? t('Creating…') : t('Create Project')}
        </Button>
      </div>
    </form>
  );
}

function EditProjectForm({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const showUndo = useUiStore((store) => store.showUndo);
  const project = useProject(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seededRef = useRef<string | null>(null);

  // Seed once per project so a background refetch cannot wipe typing.
  useEffect(() => {
    const data = project.data;
    if (!data || seededRef.current === data.id) return;

    seededRef.current = data.id;
    setForm(toForm(data));
    setError(null);
  }, [project.data]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project.data || !form) return;

    const name = form.name.trim();
    if (!name) {
      setError(t('A project needs a name.'));
      return;
    }

    try {
      await updateProject.mutateAsync({
        id: project.data.id,
        name,
        description: form.description,
        targetDate: form.targetDate === '' ? null : form.targetDate,
        aiExcluded: form.aiExcluded,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not save the project'));
    }
  }

  async function toggleArchive() {
    if (!project.data) return;

    try {
      await updateProject.mutateAsync({ id: project.data.id, archived: !project.data.archived });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not update the project'));
    }
  }

  async function handleDelete() {
    if (!project.data) return;

    const confirmed = await confirmAction({
      title: t('Delete Project'),
      message: t(
        '“{name}” will be deleted. Its tasks move to the Inbox and its milestones are removed.',
        { name: project.data.name },
      ),
      confirmLabel: t('Delete Project'),
    });
    if (!confirmed) return;

    try {
      await deleteProject.mutateAsync({ id: project.data.id });
      showUndo(t('Project “{name}” deleted', { name: project.data.name }));
      onClose();
      void navigate('/inbox');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not delete the project'));
    }
  }

  if (project.error) {
    return (
      <div className="p-5">
        <h2 id="project-dialog-title" className="text-[15px] font-semibold text-zinc-900">
          {t('Project')}
        </h2>
        <InlineError
          message={project.error.message}
          onRetry={() => {
            void project.refetch();
          }}
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>{t('Close')}</Button>
        </div>
      </div>
    );
  }

  if (!form || !project.data) {
    return (
      <div className="p-5">
        <h2 id="project-dialog-title" className="text-[15px] font-semibold text-zinc-900">
          {t('Project')}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">{t('Loading…')}</p>
      </div>
    );
  }

  return (
    <div className="max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain p-5">
      <h2 id="project-dialog-title" className="text-[15px] font-semibold text-zinc-900">
        {t('Edit Project')}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        {project.data.archived
          ? t('This project is archived.')
          : t('Changes save to this project.')}
      </p>

      <form id="project-dialog-form" className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        <Field label={t('Name')}>
          <Input
            autoFocus
            value={form.name}
            onChange={(event) => {
              setForm({ ...form, name: event.target.value });
              setError(null);
            }}
          />
        </Field>

        <Field label={t('Description')}>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(event) => {
              setForm({ ...form, description: event.target.value });
            }}
          />
        </Field>

        <Field label={t('Target Date')} hint={t('Optional.')}>
          <DatePicker
            value={form.targetDate}
            onChange={(targetDate) => {
              setForm({ ...form, targetDate });
            }}
          />
        </Field>

        <label className="flex min-h-10 items-center gap-2 text-[13px] text-zinc-700">
          <input
            type="checkbox"
            className="size-4 accent-blue-600"
            checked={form.aiExcluded}
            onChange={(event) => {
              setForm({ ...form, aiExcluded: event.target.checked });
            }}
          />
          {t('Exclude This Project from AI')}
        </label>
      </form>

      <MilestoneManager projectId={project.data.id} />

      {error && <InlineError message={error} />}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={toggleArchive} disabled={updateProject.isPending}>
            {project.data.archived ? t('Restore Project') : t('Archive Project')}
          </Button>

          <Button
            onClick={() => {
              void handleDelete();
            }}
            disabled={deleteProject.isPending}
          >
            {deleteProject.isPending ? t('Deleting…') : t('Delete Project')}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button
            type="submit"
            form="project-dialog-form"
            variant="primary"
            disabled={updateProject.isPending}
          >
            {updateProject.isPending ? t('Saving…') : t('Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MilestoneManager({ projectId }: { projectId: string }) {
  const t = useT();
  const milestones = useMilestones(projectId);
  const createMilestone = useCreateMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const reorderMilestones = useReorderMilestones(projectId);
  const removeMilestone = useRemoveMilestone(projectId);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const items = milestones.data?.milestones ?? [];

  async function addMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await createMilestone.mutateAsync({ name: trimmed });
      setName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not add the milestone'));
    }
  }

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;

    try {
      await reorderMilestones.mutateAsync({
        ids: moveItem(items, index, target).map((milestone) => milestone.id),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not reorder milestones'));
    }
  }

  async function toggleDone(milestone: Milestone) {
    try {
      await updateMilestone.mutateAsync({
        id: milestone.id,
        completedAt: milestone.completedAt ? null : new Date().toISOString(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not update the milestone'));
    }
  }

  async function remove(milestone: Milestone) {
    try {
      await removeMilestone.remove(milestone);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not delete the milestone'));
    }
  }

  return (
    <section className="mt-5 border-t border-zinc-100 pt-4">
      <h3 className="text-xs font-medium text-zinc-500">{t('Milestones')}</h3>

      {items.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">{t('No milestones yet. They are optional.')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((milestone, index) => (
            <MilestoneRow
              key={milestone.id}
              milestone={milestone}
              first={index === 0}
              last={index === items.length - 1}
              onRename={(next) => {
                void updateMilestone
                  .mutateAsync({ id: milestone.id, name: next })
                  .catch((cause: unknown) => {
                    setError(cause instanceof Error ? cause.message : t('Could not rename'));
                  });
              }}
              onMoveUp={() => {
                void move(index, -1);
              }}
              onMoveDown={() => {
                void move(index, 1);
              }}
              onToggleDone={() => {
                void toggleDone(milestone);
              }}
              onDelete={() => {
                void remove(milestone);
              }}
            />
          ))}
        </ul>
      )}

      <form className="mt-3 flex items-end gap-2" onSubmit={addMilestone}>
        <div className="flex-1">
          <Field label={t('Add Milestone')}>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </Field>
        </div>
        <Button type="submit" disabled={!name.trim() || createMilestone.isPending}>
          {t('Add')}
        </Button>
      </form>

      {error && <InlineError message={error} />}
    </section>
  );
}

function MilestoneRow({
  milestone,
  first,
  last,
  onRename,
  onMoveUp,
  onMoveDown,
  onToggleDone,
  onDelete,
}: {
  milestone: Milestone;
  first: boolean;
  last: boolean;
  onRename: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(milestone.name);

  useEffect(() => {
    setName(milestone.name);
  }, [milestone.name]);

  return (
    <li className="flex flex-wrap items-center gap-2">
      <Input
        aria-label={t('Milestone name: {name}', { name: milestone.name })}
        className="min-w-[10rem] flex-1"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== milestone.name) onRename(trimmed);
          else setName(milestone.name);
        }}
      />

      <label className="flex min-h-10 items-center gap-1.5 text-xs text-zinc-600">
        <input
          type="checkbox"
          className="size-4 accent-blue-600"
          checked={Boolean(milestone.completedAt)}
          onChange={onToggleDone}
        />
        {t('Done')}
      </label>

      <Button
        onClick={onMoveUp}
        disabled={first}
        aria-label={t('Move {name} up', { name: milestone.name })}
      >
        {t('Up')}
      </Button>
      <Button
        onClick={onMoveDown}
        disabled={last}
        aria-label={t('Move {name} down', { name: milestone.name })}
      >
        {t('Down')}
      </Button>
      <Button
        onClick={onDelete}
        aria-label={t('Delete milestone {name}', { name: milestone.name })}
      >
        {t('Delete')}
      </Button>
    </li>
  );
}
