import type { Milestone, ProjectSummary } from '@app/shared';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  useCreateMilestone,
  useCreateProject,
  useDeleteMilestone,
  useDeleteProject,
  useMilestones,
  useProject,
  useUpdateMilestone,
  useUpdateProject,
} from '../api/projects';
import { useUiStore } from '../store/ui';
import { Button } from './Button';
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
      setError('A project needs a name.');
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
      setError(cause instanceof Error ? cause.message : 'Could not create the project');
    }
  }

  return (
    <form className="p-5" onSubmit={handleSubmit}>
      <h2 id="project-dialog-title" className="text-[15px] font-semibold text-zinc-900">
        New project
      </h2>
      <p className="mt-1 text-xs text-zinc-500">A project groups related tasks and milestones.</p>

      <div className="mt-4 flex flex-col gap-3">
        <Field label="Name">
          <Input
            autoFocus
            value={form.name}
            onChange={(event) => {
              setForm({ ...form, name: event.target.value });
              setError(null);
            }}
          />
        </Field>

        <Field label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(event) => {
              setForm({ ...form, description: event.target.value });
            }}
          />
        </Field>

        <Field label="Target date" hint="Optional.">
          <Input
            type="date"
            value={form.targetDate}
            onChange={(event) => {
              setForm({ ...form, targetDate: event.target.value });
            }}
          />
        </Field>
      </div>

      {error && <InlineError message={error} />}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={createProject.isPending}>
          {createProject.isPending ? 'Creating…' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}

function EditProjectForm({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const navigate = useNavigate();
  const project = useProject(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const seededRef = useRef<string | null>(null);

  // Seed once per project so a background refetch cannot wipe typing.
  useEffect(() => {
    const data = project.data;
    if (!data || seededRef.current === data.id) return;

    seededRef.current = data.id;
    setForm(toForm(data));
    setError(null);
    setConfirmingDelete(false);
  }, [project.data]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project.data || !form) return;

    const name = form.name.trim();
    if (!name) {
      setError('A project needs a name.');
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
      setError(cause instanceof Error ? cause.message : 'Could not save the project');
    }
  }

  async function toggleArchive() {
    if (!project.data) return;

    try {
      await updateProject.mutateAsync({ id: project.data.id, archived: !project.data.archived });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the project');
    }
  }

  async function handleDelete() {
    if (!project.data) return;

    try {
      await deleteProject.mutateAsync({ id: project.data.id });
      onClose();
      void navigate('/inbox');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the project');
    }
  }

  if (project.error) {
    return (
      <div className="p-5">
        <h2 id="project-dialog-title" className="text-[15px] font-semibold text-zinc-900">
          Project
        </h2>
        <InlineError
          message={project.error.message}
          onRetry={() => {
            void project.refetch();
          }}
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  if (!form || !project.data) {
    return (
      <div className="p-5">
        <h2 id="project-dialog-title" className="text-[15px] font-semibold text-zinc-900">
          Project
        </h2>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-5">
      <h2 id="project-dialog-title" className="text-[15px] font-semibold text-zinc-900">
        Edit project
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        {project.data.archived ? 'This project is archived.' : 'Changes save to this project.'}
      </p>

      <form id="project-dialog-form" className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        <Field label="Name">
          <Input
            autoFocus
            value={form.name}
            onChange={(event) => {
              setForm({ ...form, name: event.target.value });
              setError(null);
            }}
          />
        </Field>

        <Field label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(event) => {
              setForm({ ...form, description: event.target.value });
            }}
          />
        </Field>

        <Field label="Target date" hint="Optional.">
          <Input
            type="date"
            value={form.targetDate}
            onChange={(event) => {
              setForm({ ...form, targetDate: event.target.value });
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
          Exclude this project from AI
        </label>
      </form>

      <MilestoneManager projectId={project.data.id} />

      {error && <InlineError message={error} />}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={toggleArchive} disabled={updateProject.isPending}>
            {project.data.archived ? 'Restore project' : 'Archive project'}
          </Button>

          {confirmingDelete ? (
            <>
              <Button onClick={handleDelete} disabled={deleteProject.isPending}>
                {deleteProject.isPending ? 'Deleting…' : 'Confirm delete'}
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
              Delete project
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            form="project-dialog-form"
            variant="primary"
            disabled={updateProject.isPending}
          >
            {updateProject.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {confirmingDelete && (
        <p className="mt-2 text-xs text-zinc-500">
          Deleting keeps every task and moves it to the Inbox. Milestones are removed.
        </p>
      )}
    </div>
  );
}

function MilestoneManager({ projectId }: { projectId: string }) {
  const milestones = useMilestones(projectId);
  const createMilestone = useCreateMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const deleteMilestone = useDeleteMilestone(projectId);

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
      setError(cause instanceof Error ? cause.message : 'Could not add the milestone');
    }
  }

  /**
   * Reordering rewrites positions to match the new index order, which also
   * normalises gaps left by deletes.
   */
  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);

    try {
      for (const [position, milestone] of next.entries()) {
        if (milestone.position !== position) {
          await updateMilestone.mutateAsync({ id: milestone.id, position });
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reorder milestones');
    }
  }

  async function toggleDone(milestone: Milestone) {
    try {
      await updateMilestone.mutateAsync({
        id: milestone.id,
        completedAt: milestone.completedAt ? null : new Date().toISOString(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the milestone');
    }
  }

  async function remove(milestone: Milestone) {
    try {
      await deleteMilestone.mutateAsync({ id: milestone.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the milestone');
    }
  }

  return (
    <section className="mt-5 border-t border-zinc-100 pt-4">
      <h3 className="text-xs font-medium text-zinc-500">Milestones</h3>

      {items.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">No milestones yet. They are optional.</p>
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
                    setError(cause instanceof Error ? cause.message : 'Could not rename');
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
          <Field label="Add milestone">
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </Field>
        </div>
        <Button type="submit" disabled={!name.trim() || createMilestone.isPending}>
          Add
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
  const [name, setName] = useState(milestone.name);

  useEffect(() => {
    setName(milestone.name);
  }, [milestone.name]);

  return (
    <li className="flex flex-wrap items-center gap-2">
      <Input
        aria-label={`Milestone name: ${milestone.name}`}
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
        Done
      </label>

      <Button onClick={onMoveUp} disabled={first} aria-label={`Move ${milestone.name} up`}>
        Up
      </Button>
      <Button onClick={onMoveDown} disabled={last} aria-label={`Move ${milestone.name} down`}>
        Down
      </Button>
      <Button onClick={onDelete} aria-label={`Delete milestone ${milestone.name}`}>
        Delete
      </Button>
    </li>
  );
}
