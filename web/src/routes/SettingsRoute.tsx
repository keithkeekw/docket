import type { Status, StatusCategory } from '@app/shared';
import { useEffect, useState, type FormEvent } from 'react';
import {
  useCreateStatus,
  useDeleteStatus,
  useStatuses,
  useUpdateStatus,
} from '../api/statuses';
import { Button } from '../components/Button';
import { Field, Input, Select } from '../components/Field';
import { InlineError } from '../components/InlineError';
import { PageHeader } from '../components/PageHeader';

const CATEGORIES: ReadonlyArray<{ value: StatusCategory; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
];

/**
 * DESIGN §5.5 Settings: single column, max-w 720 px, sections separated by a
 * border. M1-S8 ships the Statuses section (FR-14, US-10).
 */
export function SettingsRoute() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="How the app behaves on this machine. Everything is stored locally."
      />

      <div className="mt-6 max-w-[720px]">
        <StatusesSection />
      </div>
    </>
  );
}

function StatusesSection() {
  const statuses = useStatuses();
  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<StatusCategory>('open');
  const [error, setError] = useState<string | null>(null);

  const rows = statuses.data?.statuses ?? [];

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await createStatus.mutateAsync({ name: trimmed, category });
      setName('');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add the status');
    }
  }

  /**
   * Positions are rewritten to the new index order so a delete never leaves a
   * gap that makes a later "move up" a no-op.
   */
  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;

    const next = [...rows];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);

    try {
      for (const [position, status] of next.entries()) {
        if (status.position !== position) {
          await updateStatus.mutateAsync({ id: status.id, position });
        }
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reorder statuses');
    }
  }

  async function rename(status: Status, nextName: string) {
    try {
      await updateStatus.mutateAsync({ id: status.id, name: nextName });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not rename the status');
    }
  }

  async function recategorise(status: Status, next: StatusCategory) {
    try {
      await updateStatus.mutateAsync({ id: status.id, category: next });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the status');
    }
  }

  async function remove(status: Status) {
    try {
      await deleteStatus.mutateAsync({ id: status.id });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the status');
    }
  }

  return (
    <section className="border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">Statuses</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        The order here is the order of Kanban columns and the status picker. A status in use cannot
        be deleted until its tasks move to another one.
      </p>

      {statuses.isLoading && <p className="mt-3 text-sm text-zinc-500">Loading…</p>}

      {statuses.error && (
        <InlineError
          message={statuses.error.message}
          onRetry={() => {
            void statuses.refetch();
          }}
        />
      )}

      {rows.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((status, index) => (
            <StatusRow
              key={status.id}
              status={status}
              first={index === 0}
              last={index === rows.length - 1}
              canDelete={status.taskCount === 0 && rows.length > 1}
              onRename={(next) => {
                void rename(status, next);
              }}
              onRecategorise={(next) => {
                void recategorise(status, next);
              }}
              onMoveUp={() => {
                void move(index, -1);
              }}
              onMoveDown={() => {
                void move(index, 1);
              }}
              onDelete={() => {
                void remove(status);
              }}
            />
          ))}
        </ul>
      )}

      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={handleAdd}>
        <div className="min-w-[12rem] flex-1">
          <Field label="Add status">
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </Field>
        </div>

        <div className="w-[8rem]">
          <Field label="Category">
            <Select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as StatusCategory);
              }}
            >
              {CATEGORIES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button type="submit" disabled={!name.trim() || createStatus.isPending}>
          Add
        </Button>
      </form>

      {error && <InlineError message={error} />}
    </section>
  );
}

function StatusRow({
  status,
  first,
  last,
  canDelete,
  onRename,
  onRecategorise,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  status: Status;
  first: boolean;
  last: boolean;
  canDelete: boolean;
  onRename: (name: string) => void;
  onRecategorise: (category: StatusCategory) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(status.name);

  useEffect(() => {
    setName(status.name);
  }, [status.name]);

  return (
    <li className="flex flex-wrap items-center gap-2">
      <div className="min-w-[10rem] flex-1">
        <Input
          aria-label={`Status name: ${status.name}`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed && trimmed !== status.name) onRename(trimmed);
            else setName(status.name);
          }}
        />
      </div>

      <div className="w-[7.5rem]">
        <Select
          aria-label={`Category for ${status.name}`}
          value={status.category}
          onChange={(event) => {
            onRecategorise(event.target.value as StatusCategory);
          }}
        >
          {CATEGORIES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </Select>
      </div>

      <span className="w-[4.5rem] text-right text-xs text-zinc-500">
        {status.taskCount === 0
          ? 'unused'
          : `${status.taskCount} ${status.taskCount === 1 ? 'task' : 'tasks'}`}
      </span>

      <Button onClick={onMoveUp} disabled={first} aria-label={`Move ${status.name} up`}>
        Up
      </Button>
      <Button onClick={onMoveDown} disabled={last} aria-label={`Move ${status.name} down`}>
        Down
      </Button>
      <Button
        onClick={onDelete}
        disabled={!canDelete}
        aria-label={`Delete status ${status.name}`}
        title={canDelete ? undefined : 'Move its tasks to another status first'}
      >
        Delete
      </Button>
    </li>
  );
}
