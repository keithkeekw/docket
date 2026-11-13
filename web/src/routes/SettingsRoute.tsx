import type {
  AiFeature,
  AiProvider,
  Status,
  StatusCategory,
} from '@app/shared';
import { format, parseISO } from 'date-fns';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAiSettings, useUpdateAiSettings } from '../api/aiSettings';
import { useBackups, useCreateBackup, useRestoreBackup } from '../api/backups';
import { useProjects } from '../api/projects';
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
        <AiSection />
        <PrivacySection />
        <DataSection />
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * DESIGN §5.5 Data section: Backup now, a list of local copies with Download,
 * and Restore (FR-27, D11 — no uploads in M1). Restoring asks once, because it
 * replaces every row; the server also keeps a pre-restore snapshot.
 */
function DataSection() {
  const backups = useBackups();
  const createBackup = useCreateBackup();
  const restore = useRestoreBackup();

  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = backups.data?.backups ?? [];

  async function handleBackup() {
    try {
      const { backup } = await createBackup.mutateAsync();
      setMessage(`Backup created: ${backup.file}`);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a backup');
    }
  }

  async function handleRestore(file: string) {
    try {
      const result = await restore.mutateAsync({ file });
      setMessage(
        `Restored from ${result.restored}. A safety copy of the previous data is kept as ${result.safetyBackup.file}.`,
      );
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not restore that backup');
    } finally {
      setConfirming(null);
    }
  }

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">Data</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        Backups are whole copies of the database, kept in <code>data/backups</code>. Restoring
        replaces every project, task and setting with the copy you pick.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={handleBackup} disabled={createBackup.isPending}>
          {createBackup.isPending ? 'Backing up…' : 'Backup now'}
        </Button>
        <span className="text-xs text-zinc-500">
          {rows.length === 0
            ? 'No backups yet.'
            : `${rows.length} ${rows.length === 1 ? 'backup' : 'backups'} available.`}
        </span>
      </div>

      {backups.error && (
        <InlineError
          message={backups.error.message}
          onRetry={() => {
            void backups.refetch();
          }}
        />
      )}

      {rows.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((backup) => (
            <li key={backup.file} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[12rem] flex-1 truncate text-sm text-zinc-900">
                {format(parseISO(backup.createdAt), 'd MMM yyyy, HH:mm:ss')}
              </span>

              <span className="w-[4.5rem] text-right text-xs text-zinc-500">
                {formatBytes(backup.sizeBytes)}
              </span>

              <a
                href={`/api/backups/${encodeURIComponent(backup.file)}`}
                download={backup.file}
                className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 bg-white px-3.5 text-[13px] text-zinc-900"
              >
                Download
              </a>

              {confirming === backup.file ? (
                <>
                  <Button
                    onClick={() => {
                      void handleRestore(backup.file);
                    }}
                    disabled={restore.isPending}
                  >
                    {restore.isPending ? 'Restoring…' : 'Confirm restore'}
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirming(null);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setConfirming(backup.file);
                    setMessage(null);
                    setError(null);
                  }}
                >
                  Restore
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700">{message}</p>}
      {error && <InlineError message={error} />}
    </section>
  );
}

const FEATURE_LABELS: ReadonlyArray<{ feature: AiFeature; label: string }> = [
  { feature: 'capture', label: 'Capture' },
  { feature: 'breakdown', label: 'Breakdown' },
  { feature: 'review_daily', label: 'Daily review' },
  { feature: 'review_weekly', label: 'Weekly review' },
  { feature: 'chat', label: 'Chat' },
];

const PROVIDER_LABELS: Record<AiProvider, string> = {
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
};

type Draft = Record<AiFeature, { provider: AiProvider | ''; model: string }>;

function emptyDraft(): Draft {
  return {
    capture: { provider: '', model: '' },
    breakdown: { provider: '', model: '' },
    review_daily: { provider: '', model: '' },
    review_weekly: { provider: '', model: '' },
    chat: { provider: '', model: '' },
  };
}

/**
 * DESIGN §5.5 *AI providers* and *AI features* (FR-24, FR-26). Keys live in
 * `.env` and are only ever reported as present/absent (NFR-2, D48); the model
 * is free text because TECHSTACK §6.1 says not to hard-code model IDs.
 */
function AiSection() {
  const ai = useAiSettings();
  const save = useUpdateAiSettings();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!ai.data || seededRef.current) return;

    seededRef.current = true;
    setDraft(
      ai.data.features.reduce<Draft>((accumulator, entry) => {
        accumulator[entry.feature] = {
          provider: entry.provider ?? '',
          model: entry.model ?? '',
        };
        return accumulator;
      }, emptyDraft()),
    );
  }, [ai.data]);

  async function handleSave() {
    if (!draft) return;

    for (const { feature, label } of FEATURE_LABELS) {
      const entry = draft[feature];
      if (entry.provider !== '' && entry.model.trim() === '') {
        setError(`Enter a model for ${label}, or set it to Not configured.`);
        return;
      }
    }

    try {
      const saved = await save.mutateAsync({
        features: FEATURE_LABELS.map(({ feature }) => {
          const entry = draft[feature];

          return entry.provider === ''
            ? { feature, provider: null, model: null }
            : { feature, provider: entry.provider, model: entry.model.trim() };
        }),
      });

      seededRef.current = false;
      setDraft(
        saved.features.reduce<Draft>((accumulator, entry) => {
          accumulator[entry.feature] = {
            provider: entry.provider ?? '',
            model: entry.model ?? '',
          };
          return accumulator;
        }, emptyDraft()),
      );
      seededRef.current = true;
      setError(null);
      setMessage('AI settings saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the AI settings');
    }
  }

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">AI</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        Nothing leaves this machine until a feature below is configured and its provider has a key.
        Keys are read from <code>.env</code> at server start and are never shown here.
      </p>

      {ai.isLoading && <p className="mt-3 text-sm text-zinc-500">Loading…</p>}

      {ai.error && (
        <InlineError
          message={ai.error.message}
          onRetry={() => {
            void ai.refetch();
          }}
        />
      )}

      {ai.data && (
        <>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600">
            {ai.data.providers.map((provider) => (
              <li key={provider.provider} className="flex items-center gap-1.5">
                <span className="font-medium text-zinc-700">{PROVIDER_LABELS[provider.provider]}</span>
                <span className={provider.configured ? 'text-zinc-600' : 'text-zinc-500'}>
                  {provider.configured ? 'Configured' : 'Not configured'}
                </span>
              </li>
            ))}
          </ul>

          {!ai.data.providers.some((provider) => provider.configured) && (
            <p className="mt-2 text-xs text-zinc-500">
              Add <code>DEEPSEEK_API_KEY</code> or <code>OPENROUTER_API_KEY</code> to{' '}
              <code>.env</code> and restart the server.
            </p>
          )}

          {draft && (
            <div className="mt-4">
              <div className="grid grid-cols-[7rem_9rem_1fr] items-center gap-2 pb-1 text-[11px] text-zinc-500">
                <span>Feature</span>
                <span>Provider</span>
                <span>Model</span>
              </div>

              <div className="flex flex-col gap-2">
                {FEATURE_LABELS.map(({ feature, label }) => (
                  <div key={feature} className="grid grid-cols-[7rem_9rem_1fr] items-center gap-2">
                    <span className="text-[13px] text-zinc-900">{label}</span>

                    <Select
                      aria-label={`Provider for ${label}`}
                      value={draft[feature].provider}
                      onChange={(event) => {
                        const provider = event.target.value as AiProvider | '';
                        setDraft({ ...draft, [feature]: { ...draft[feature], provider } });
                        setMessage(null);
                      }}
                    >
                      <option value="">Not configured</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="openrouter">OpenRouter</option>
                    </Select>

                    <Input
                      aria-label={`Model for ${label}`}
                      placeholder="e.g. deepseek-chat"
                      disabled={draft[feature].provider === ''}
                      value={draft[feature].model}
                      onChange={(event) => {
                        setDraft({ ...draft, [feature]: { ...draft[feature], model: event.target.value } });
                        setMessage(null);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Button onClick={handleSave} disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : 'Save AI settings'}
                </Button>
                {message && <span className="text-xs text-zinc-600">{message}</span>}
              </div>
            </div>
          )}
        </>
      )}

      {error && <InlineError message={error} />}
    </section>
  );
}

/**
 * DESIGN §5.5 *Privacy*: the excluded projects are toggled in the project
 * dialog; this section shows which ones are left out of AI requests (FR-25).
 */
function PrivacySection() {
  const projects = useProjects();
  const excluded = (projects.data?.projects ?? []).filter((project) => project.aiExcluded);

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">Privacy</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        Excluded projects and their tasks are left out of every AI request. Change it in a
        project&rsquo;s settings.
      </p>

      {projects.error && (
        <InlineError
          message={projects.error.message}
          onRetry={() => {
            void projects.refetch();
          }}
        />
      )}

      {excluded.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No projects are excluded.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {excluded.map((project) => (
            <li key={project.id}>
              <Link to={`/projects/${project.id}`} className="text-[13px] text-blue-600 hover:underline">
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
