import type {
  AiFeature,
  AiProvider,
  AiProviderStatus,
  PromptEntry,
  Status,
  StatusCategory,
  UpdateReviewScheduleBody,
} from '@app/shared';
import { addDays, format, parseISO } from 'date-fns';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  useAiSettings,
  usePrompts,
  useProviderModels,
  useRemoveProviderKey,
  useResetPrompt,
  useSavePrompt,
  useSaveProviderKey,
  useUpdateAiSettings,
} from '../api/aiSettings';
import { useBackups, useCreateBackup, useRestoreBackup } from '../api/backups';
import { useProjects } from '../api/projects';
import { useReviewSchedule, useUpdateReviewSchedule } from '../api/reviews';
import { useCreateStatus, useDeleteStatus, useStatuses, useUpdateStatus } from '../api/statuses';
import { buttonClassName } from '../lib/button';
import { Button } from '../components/Button';
import { Field, Input, Select } from '../components/Field';
import { InlineError } from '../components/InlineError';
import { PageHeader } from '../components/PageHeader';
import { PrelineTooltip } from '../components/PrelineTooltip';
import { Switch } from '../components/Switch';
import { TimeZonePicker } from '../components/TimeZonePicker';
import { UpdatesSection } from '../components/UpdatesSection';
import { Kbd } from '../components/Kbd';
import {
  formatClockDay,
  formatClockOffset,
  formatClockTime,
  timeZoneLabel,
} from '../lib/clocks';
import { cx } from '../lib/cx';
import { useLocale } from '../lib/i18n';
import { useDateLocale, useT } from '../lib/i18n';
import { bindingLabel } from '../lib/platform';
import { useNow } from '../lib/useNow';
import { confirmAction } from '../store/confirm';
import { MAX_CLOCKS, useClocksStore } from '../store/clocks';
import { ALL_SHORTCUTS, useKeybindingsStore } from '../store/keybindings';

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
  const t = useT();

  return (
    <>
      <PageHeader
        title={t('Settings')}
        description={t('How the app behaves on this machine. Everything is stored locally.')}
      />

      <div className="mt-6 max-w-[720px]">
        <StatusesSection />
        <KeyBindingsSection />
        <AiSection />
        <PromptManagementSection />
        <ReviewsSection />
        <ClocksSection />
        <PrivacySection />
        <DataSection />
        <UpdatesSection />
      </div>
    </>
  );
}

function StatusesSection() {
  const t = useT();
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
      setError(cause instanceof Error ? cause.message : t('Could not add the status'));
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
      setError(cause instanceof Error ? cause.message : t('Could not reorder statuses'));
    }
  }

  async function rename(status: Status, nextName: string) {
    try {
      await updateStatus.mutateAsync({ id: status.id, name: nextName });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not rename the status'));
    }
  }

  async function recategorise(status: Status, next: StatusCategory) {
    try {
      await updateStatus.mutateAsync({ id: status.id, category: next });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not update the status'));
    }
  }

  async function remove(status: Status) {
    const confirmed = await confirmAction({
      title: t('Delete Status'),
      message: t('“{name}” will be deleted from the status picker and Kanban columns.', {
        name: status.name,
      }),
      confirmLabel: t('Delete Status'),
    });
    if (!confirmed) return;

    try {
      await deleteStatus.mutateAsync({ id: status.id });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not delete the status'));
    }
  }

  return (
    <section className="border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">{t('Statuses')}</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        {t(
          'The order here is the order of Kanban columns and the status picker. A status in use cannot be deleted until its tasks move to another one.',
        )}
      </p>

      {statuses.isLoading && <p className="mt-3 text-sm text-zinc-500">{t('Loading…')}</p>}

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

      <form className="mt-3 flex flex-col gap-2" onSubmit={handleAdd}>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Field label={t('Add Status')}>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </Field>
          </div>
          <div className="w-[7.5rem] shrink-0">
            <Field label={t('Category')}>
              <Select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as StatusCategory);
                }}
              >
                {CATEGORIES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {t(entry.label)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
        <div>
          <Button type="submit" disabled={!name.trim() || createStatus.isPending}>
            {t('Add')}
          </Button>
        </div>
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
  const t = useT();
  const [name, setName] = useState(status.name);

  useEffect(() => {
    setName(status.name);
  }, [status.name]);

  return (
    <li className="flex flex-wrap items-center gap-2">
      <div className="min-w-[9rem] flex-1">
        <Input
          aria-label={t('Status name: {name}', { name: status.name })}
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

      <div className="w-[7.5rem] shrink-0">
        <Select
          aria-label={t('Category for {name}', { name: status.name })}
          value={status.category}
          onChange={(event) => {
            onRecategorise(event.target.value as StatusCategory);
          }}
        >
          {CATEGORIES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {t(entry.label)}
            </option>
          ))}
        </Select>
      </div>

      <span className="w-[4.5rem] shrink-0 text-right text-xs text-zinc-500">
        {status.taskCount === 0
          ? t('Unused')
          : t(status.taskCount === 1 ? '{count} task' : '{count} tasks', {
              count: status.taskCount,
            })}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={first}
          aria-label={t('Move {name} up', { name: status.name })}
          title={t('Move Up')}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-white disabled:text-zinc-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
            <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 0 1-1.06-.02L10 8.832l-3.71 3.938a.75.75 0 1 1-1.08-1.04l4.25-4.5a.75.75 0 0 1 1.08 0l4.25 4.5a.75.75 0 0 1-.02 1.06Z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={last}
          aria-label={t('Move {name} down', { name: status.name })}
          title={t('Move Down')}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-white disabled:text-zinc-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label={t('Delete status {name}', { name: status.name })}
          title={canDelete ? t('Delete Status') : t('Move its tasks to another status first')}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-white disabled:text-zinc-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-5" aria-hidden="true">
            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
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
  const t = useT();
  const dateLocale = useDateLocale();
  const locale = useLocale();
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
      setMessage(t('Backup created: {file}', { file: backup.file }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not create a backup'));
    }
  }

  async function handleRestore(file: string) {
    try {
      const result = await restore.mutateAsync({ file });
      setMessage(
        t('Restored from {file}. A safety copy of the previous data is kept as {safety}.', {
          file: result.restored,
          safety: result.safetyBackup.file,
        }),
      );
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not restore that backup'));
    } finally {
      setConfirming(null);
    }
  }

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">{t('Data')}</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        {t('Backups are whole copies of the database, kept in')}{' '}
        <code>data/backups</code>
        {t('. Restoring replaces every project, task and setting with the copy you pick.')}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={handleBackup} disabled={createBackup.isPending}>
          {createBackup.isPending ? t('Backing up…') : t('Backup Now')}
        </Button>
        <span className="text-xs text-zinc-500">
          {rows.length === 0
            ? t('No backups yet.')
            : t(rows.length === 1 ? '{count} backup available.' : '{count} backups available.', {
                count: rows.length,
              })}
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
                {format(parseISO(backup.createdAt), locale === 'zh' ? 'yyyy年M月d日 HH:mm:ss' : 'd MMM yyyy, HH:mm:ss', {
                  locale: dateLocale,
                })}
              </span>

              <span className="w-[4.5rem] text-right text-xs text-zinc-500">
                {formatBytes(backup.sizeBytes)}
              </span>

              <a
                href={`/api/backups/${encodeURIComponent(backup.file)}`}
                download={backup.file}
                className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 bg-white px-3.5 text-[13px] text-zinc-900"
              >
                {t('Download')}
              </a>

              {confirming === backup.file ? (
                <>
                  <Button
                    onClick={() => {
                      void handleRestore(backup.file);
                    }}
                    disabled={restore.isPending}
                  >
                    {restore.isPending ? t('Restoring…') : t('Confirm Restore')}
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirming(null);
                    }}
                  >
                    {t('Cancel')}
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
                  {t('Restore')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700">{message}</p>
      )}
      {error && <InlineError message={error} />}

      <div className="mt-6 border-t border-zinc-100 pt-4">
        <h3 className="text-[13px] font-medium text-zinc-900">{t('Export')}</h3>
        <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
          {t(
            'A full copy of your projects, tasks, reviews and settings — for keeping outside the app. Keys are never included.',
          )}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <a href="/api/export?format=json" download className={buttonClassName('secondary')}>
            {t('Export JSON')}
          </a>
          <a href="/api/export?format=markdown" download className={buttonClassName('secondary')}>
            {t('Export Markdown')}
          </a>
        </div>
      </div>
    </section>
  );
}

const FEATURE_LABELS: ReadonlyArray<{ feature: AiFeature; label: string }> = [
  { feature: 'capture', label: 'Capture' },
  { feature: 'breakdown', label: 'Breakdown' },
  { feature: 'summarize', label: 'Summarize' },
  { feature: 'review_daily', label: 'Daily Review' },
  { feature: 'review_weekly', label: 'Weekly Review' },
  { feature: 'chat', label: 'Chat' },
];

/** Brand names stay untranslated; `example` seeds the model placeholder. */
const PROVIDERS: Record<AiProvider, { label: string; keyUrl: string; example: string }> = {
  deepseek: {
    label: 'DeepSeek',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    example: 'deepseek-chat',
  },
  openrouter: {
    label: 'OpenRouter',
    keyUrl: 'https://openrouter.ai/keys',
    example: 'openai/gpt-4o-mini',
  },
  openai: {
    label: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    example: 'gpt-4.1-mini',
  },
  gemini: {
    label: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    example: 'gemini-2.5-flash',
  },
  anthropic: {
    label: 'Anthropic Claude',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    example: 'claude-sonnet-4-5',
  },
  mistral: {
    label: 'Mistral',
    keyUrl: 'https://console.mistral.ai/api-keys',
    example: 'mistral-small-latest',
  },
  qwen: {
    label: 'Alibaba Qwen',
    keyUrl: 'https://www.alibabacloud.com/help/en/model-studio/get-api-key',
    example: 'qwen-plus',
  },
};

const ICON_BUTTON =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * One provider's key. The key is write-only: once saved, only where it came
 * from and its last four characters come back from the server (NFR-2).
 */
function ProviderKeyRow({ status }: { status: AiProviderStatus }) {
  const t = useT();
  const saveKey = useSaveProviderKey();
  const removeKey = useRemoveProviderKey();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const meta = PROVIDERS[status.provider];
  const showInput = editing || !status.configured;
  const busy = saveKey.isPending || removeKey.isPending;

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const apiKey = value.trim();
    if (!apiKey) return;

    setError(null);
    try {
      await saveKey.mutateAsync({ provider: status.provider, apiKey });
      setValue('');
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not save the API key'));
    }
  }

  async function handleRemove() {
    const confirmed = await confirmAction({
      title: t('Remove API Key'),
      message: t('Features that use {provider} will stop working until a new key is added.', {
        provider: meta.label,
      }),
      confirmLabel: t('Remove Key'),
    });
    if (!confirmed) return;

    setError(null);
    try {
      await removeKey.mutateAsync({ provider: status.provider });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not remove the API key'));
    }
  }

  const masked = status.hint ? `••••${status.hint}` : '••••';

  return (
    <li className="grid grid-cols-[9rem_1fr] items-center gap-2 py-1.5 sm:grid-cols-[10rem_1fr]">
      <div className="flex min-w-0 flex-col">
        <span className="text-[13px] text-zinc-900">{meta.label}</span>
        <a
          href={meta.keyUrl}
          target="_blank"
          rel="noreferrer"
          className="w-fit text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
        >
          {t('Get a Key')}
        </a>
      </div>

      {showInput ? (
        <form onSubmit={handleSave} className="flex items-center gap-2">
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            aria-label={t('API key for {provider}', { provider: meta.label })}
            placeholder={t('Paste API key')}
            value={value}
            disabled={busy}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            className="font-mono text-[12px]"
          />
          <PrelineTooltip label={saveKey.isPending ? t('Saving…') : t('Save Key')}>
            <button
              type="submit"
              disabled={busy || value.trim() === ''}
              aria-label={saveKey.isPending ? t('Saving…') : t('Save Key')}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={cx(
                  'size-4',
                  saveKey.isPending && 'animate-pulse motion-reduce:animate-none',
                )}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </PrelineTooltip>
          {status.configured && (
            <PrelineTooltip label={t('Cancel')}>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setValue('');
                  setError(null);
                }}
                aria-label={t('Cancel')}
                className={ICON_BUTTON}
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
          )}
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex min-h-10 flex-1 items-center gap-2 rounded-[10px] border border-zinc-200 bg-zinc-50 px-3 text-[13px] text-zinc-700">
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="font-mono text-[12px] text-zinc-600">{masked}</span>
            <span className="ml-auto text-[11px] text-zinc-500">
              {status.source === 'env' ? t('From .env') : t('Saved')}
            </span>
          </span>
          <PrelineTooltip label={t('Replace Key')}>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
              }}
              aria-label={t('Replace Key')}
              className={ICON_BUTTON}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4"
                aria-hidden="true"
              >
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
            </button>
          </PrelineTooltip>
          {status.source === 'settings' && (
            <PrelineTooltip label={removeKey.isPending ? t('Removing…') : t('Remove Key')}>
              <button
                type="button"
                onClick={() => {
                  void handleRemove();
                }}
                disabled={busy}
                aria-label={removeKey.isPending ? t('Removing…') : t('Remove Key')}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={cx(
                    'size-4',
                    removeKey.isPending && 'animate-pulse motion-reduce:animate-none',
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
          )}
        </div>
      )}

      {error && <p className="col-start-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}

type Draft = Record<AiFeature, { provider: AiProvider | ''; model: string }>;

function emptyDraft(): Draft {
  return {
    capture: { provider: '', model: '' },
    breakdown: { provider: '', model: '' },
    summarize: { provider: '', model: '' },
    review_daily: { provider: '', model: '' },
    review_weekly: { provider: '', model: '' },
    chat: { provider: '', model: '' },
  };
}

function ModelInput({
  provider,
  label,
  value,
  disabled,
  hasKey,
  onChange,
}: {
  provider: AiProvider | '';
  label: string;
  value: string;
  disabled: boolean;
  hasKey: boolean;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const models = useProviderModels(hasKey ? provider : '');
  const listId = `models-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <>
      <input
        list={models.data?.length ? listId : undefined}
        aria-label={t('Model for {feature}', { feature: t(label) })}
        placeholder={
          models.isFetching
            ? t('Loading models…')
            : t('e.g. {model}', { model: PROVIDERS[provider || 'deepseek'].example })
        }
        disabled={disabled}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onFocus={(event) => {
          event.target.select();
        }}
        className="w-full rounded-[10px] border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 min-h-10"
      />
      {models.data?.length ? (
        <datalist id={listId}>
          {models.data.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

/**
 * DESIGN §5.5 *AI providers* and *AI features* (FR-24, FR-26). Keys are pasted
 * here (or read from `.env` as a fallback) and are never sent back (NFR-2, D48);
 * the model is free text because TECHSTACK §6.1 says not to hard-code model IDs.
 */
function AiSection() {
  const t = useT();
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
        setError(
          t('Enter a model for {feature}, or set it to Not Configured.', {
            feature: t(label),
          }),
        );
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
      setMessage(t('AI settings saved.'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not save the AI settings'));
    }
  }

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">{t('AI')}</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        {t(
          'Nothing leaves this machine until a feature below is configured and its provider has a key. Keys are stored on this computer and only their last four characters are ever shown again.',
        )}
      </p>

      {ai.isLoading && <p className="mt-3 text-sm text-zinc-500">{t('Loading…')}</p>}

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
          <h3 className="mt-4 text-[13px] font-medium text-zinc-900">{t('API Keys')}</h3>
          {!ai.data.providers.some((provider) => provider.configured) && (
            <p className="mt-1 text-xs text-zinc-500">
              {t('Paste a key for at least one provider to get started.')}
            </p>
          )}
          <ul className="mt-1 divide-y divide-zinc-100">
            {ai.data.providers.map((status) => (
              <ProviderKeyRow key={status.provider} status={status} />
            ))}
          </ul>

          <h3 className="mt-5 text-[13px] font-medium text-zinc-900">{t('Models')}</h3>

          {draft && (
            <div className="mt-4">
              <div className="grid grid-cols-[7rem_12rem_1fr] items-center gap-2 pb-1 text-[11px] text-zinc-500">
                <span>{t('Feature')}</span>
                <span>{t('Provider')}</span>
                <span>{t('Model')}</span>
              </div>

              <div className="flex flex-col gap-2">
                {FEATURE_LABELS.map(({ feature, label }) => (
                  <div key={feature} className="grid grid-cols-[7rem_12rem_1fr] items-center gap-2">
                    <span className="text-[13px] text-zinc-900">{t(label)}</span>

                    <Select
                      aria-label={t('Provider for {feature}', { feature: t(label) })}
                      value={draft[feature].provider}
                      onChange={(event) => {
                        const provider = event.target.value as AiProvider | '';
                        setDraft({ ...draft, [feature]: { ...draft[feature], provider } });
                        setMessage(null);
                      }}
                    >
                      <option value="">{t('Not Configured')}</option>
                      {ai.data.providers.map((status) => (
                        <option key={status.provider} value={status.provider}>
                          {status.configured
                            ? PROVIDERS[status.provider].label
                            : t('{provider} (No Key)', {
                                provider: PROVIDERS[status.provider].label,
                              })}
                        </option>
                      ))}
                    </Select>

                    <ModelInput
                      provider={draft[feature].provider}
                      label={label}
                      disabled={draft[feature].provider === ''}
                      hasKey={ai.data.providers.some(
                        (status) => status.provider === draft[feature].provider && status.configured,
                      )}
                      value={draft[feature].model}
                      onChange={(model) => {
                        setDraft({ ...draft, [feature]: { ...draft[feature], model } });
                        setMessage(null);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Button onClick={handleSave} disabled={save.isPending}>
                  {save.isPending ? t('Saving…') : t('Save AI Settings')}
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

function PromptManagementSection() {
  const t = useT();
  const prompts = usePrompts();

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">{t('Prompt Management')}</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        {t(
          'Every system prompt the app sends to a model. Edit one below; changes apply to the next AI request.',
        )}
      </p>

      {prompts.isLoading && <p className="mt-3 text-sm text-zinc-500">{t('Loading…')}</p>}

      {prompts.error && (
        <InlineError
          message={prompts.error.message}
          onRetry={() => {
            void prompts.refetch();
          }}
        />
      )}

      {prompts.data && (
        <div className="mt-3 flex flex-col gap-2">
          {prompts.data.prompts.map((prompt) => (
            <PromptEditor key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}
    </section>
  );
}

function PromptEditor({ prompt }: { prompt: PromptEntry }) {
  const t = useT();
  const save = useSavePrompt();
  const reset = useResetPrompt();
  const [draft, setDraft] = useState(prompt.content);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(prompt.content);
  }, [prompt.content]);

  const dirty = draft !== prompt.content;

  async function handleSave() {
    setMessage(null);
    setError(null);
    try {
      await save.mutateAsync({ id: prompt.id, content: draft });
      setMessage(t('Prompt saved.'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not save the prompt'));
    }
  }

  async function handleReset() {
    const confirmed = await confirmAction({
      title: t('Reset Prompt'),
      message: t('“{name}” will revert to the built-in prompt.', { name: t(prompt.label) }),
      confirmLabel: t('Reset Prompt'),
    });
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    try {
      await reset.mutateAsync({ id: prompt.id });
      setMessage(t('Prompt reset to default.'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not reset the prompt'));
    }
  }

  return (
    <details className="group rounded-xl border border-zinc-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-3.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium text-zinc-900">{t(prompt.label)}</span>
        {prompt.customized && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
            {t('Customized')}
          </span>
        )}
        <span className="ml-auto truncate text-[11px] text-zinc-400">{prompt.id}</span>
      </summary>

      <div className="border-t border-zinc-100 px-4 py-3">
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setMessage(null);
            setError(null);
          }}
          rows={14}
          aria-label={t('{name} prompt', { name: t(prompt.label) })}
          className="w-full resize-y rounded-[10px] border border-zinc-200 bg-white px-3 py-2 font-mono text-[12px] leading-relaxed text-zinc-900"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={() => { void handleSave(); }}
            disabled={!dirty || draft.trim() === '' || save.isPending}
          >
            {save.isPending ? t('Saving…') : t('Save Prompt')}
          </Button>
          <Button
            onClick={() => { void handleReset(); }}
            disabled={!prompt.customized || reset.isPending}
          >
            {reset.isPending ? t('Resetting…') : t('Reset to Default')}
          </Button>
          <span className="ml-auto text-[11px] text-zinc-500">
            {t('{count} characters', { count: draft.length })}
          </span>
        </div>

        {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </details>
  );
}

const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
/** Monday 9 November 2026; adding `isoDay - 1` days gives that weekday's name. */
const A_MONDAY = new Date(2026, 10, 9);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Settings → Reviews: whether reviews are written on a schedule, how often and when. */
function ReviewsSection() {
  const t = useT();
  const dateLocale = useDateLocale();
  const schedule = useReviewSchedule();
  const update = useUpdateReviewSchedule();
  const aiSettings = useAiSettings();
  const switchId = useId();

  const weekdayName = (isoDay: number) =>
    format(addDays(A_MONDAY, isoDay - 1), 'EEEE', { locale: dateLocale });

  function save(body: UpdateReviewScheduleBody) {
    update.mutate(body);
  }

  const data = schedule.data;
  const weekly = data?.frequency === 'weekly';
  const time = data ? (weekly ? data.weeklyTime : data.dailyTime) : '';

  const feature: AiFeature = weekly ? 'review_weekly' : 'review_daily';
  const featureSetting = aiSettings.data?.features.find((entry) => entry.feature === feature);
  const providerReady = aiSettings.data?.providers.some(
    (entry) => entry.provider === featureSetting?.provider && entry.configured,
  );
  const needsModel =
    Boolean(data?.enabled) &&
    aiSettings.data !== undefined &&
    !(featureSetting?.provider && featureSetting.model && providerReady);

  let summary = '';
  if (data && !data.enabled) {
    summary = t('Reviews are only written when you press Generate Now on the Reviews page.');
  } else if (data && weekly) {
    summary = t('A weekly review is written every {day} at {time} while Docket is running.', {
      day: weekdayName(data.weeklyDay),
      time,
    });
  } else if (data) {
    summary = t('A daily review is written every day at {time} while Docket is running.', {
      time,
    });
  }

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">{t('Reviews')}</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        {t('Have the assistant write a review for you on a schedule.')}
      </p>

      {schedule.error && (
        <InlineError
          message={schedule.error.message}
          onRetry={() => {
            void schedule.refetch();
          }}
        />
      )}
      {update.error && <InlineError message={t(update.error.message)} />}

      {schedule.isLoading && <p className="mt-3 text-sm text-zinc-500">{t('Loading…')}</p>}

      {data && (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <label htmlFor={switchId} className="text-[13px] font-medium text-zinc-900">
                {t('Scheduled Reviews')}
              </label>
              <p className="mt-0.5 text-xs text-zinc-500">{summary}</p>
            </div>
            <Switch
              id={switchId}
              checked={data.enabled}
              onChange={(enabled) => {
                save({ enabled });
              }}
            />
          </div>

          <div
            className={cx(
              'grid gap-3 border-t border-zinc-100 px-4 py-3',
              weekly ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
            )}
          >
            <Field label={t('Frequency')}>
              <Select
                value={data.frequency}
                disabled={!data.enabled}
                onChange={(event) => {
                  save({ frequency: event.target.value === 'weekly' ? 'weekly' : 'daily' });
                }}
              >
                <option value="daily">{t('Daily')}</option>
                <option value="weekly">{t('Weekly')}</option>
              </Select>
            </Field>

            {weekly && (
              <Field label={t('Day')}>
                <Select
                  value={String(data.weeklyDay)}
                  disabled={!data.enabled}
                  onChange={(event) => {
                    save({ weeklyDay: Number(event.target.value) });
                  }}
                >
                  {ISO_WEEKDAYS.map((day) => (
                    <option key={day} value={String(day)}>
                      {weekdayName(day)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label={t('Time')}>
              <Input
                type="time"
                value={time}
                disabled={!data.enabled}
                onChange={(event) => {
                  const next = event.target.value;
                  if (!TIME_PATTERN.test(next)) return;
                  save(weekly ? { weeklyTime: next } : { dailyTime: next });
                }}
              />
            </Field>
          </div>

          {needsModel && (
            <p className="border-t border-zinc-100 px-4 py-3 text-xs text-orange-700">
              {t('Choose a model for {feature} in the AI section above, or no review will be written.', {
                feature: weekly ? t('Weekly Review') : t('Daily Review'),
              })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ClocksSection() {
  const t = useT();
  const { zones, addZone, removeZone } = useClocksStore();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  const intlLocale = useLocale() === 'zh' ? 'zh-CN' : 'en';
  const pickerId = useId();

  const atLimit = zones.length >= MAX_CLOCKS;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    addClock(draft);
  }

  function addClock(zone: string) {
    setError(null);

    const trimmed = zone.trim();
    if (trimmed === '') {
      setError(t('Enter a time zone, for example Asia/Tokyo.'));
      return;
    }

    const result = addZone(trimmed);
    if (result === 'invalid') {
      setError(t('“{name}” is not a valid IANA time zone.', { name: trimmed }));
      return;
    }
    if (result === 'duplicate') {
      setError(t('That time zone is already on the list.'));
      return;
    }
    if (result === 'limit') {
      setError(t('You can add up to {total} time zones.', { total: MAX_CLOCKS }));
      return;
    }

    setDraft('');
  }

  async function handleRemove(zone: string) {
    const confirmed = await confirmAction({
      title: t('Remove Clock'),
      message: t('{name} will be removed from the Dashboard.', { name: timeZoneLabel(zone) }),
      confirmLabel: t('Remove Clock'),
    });
    if (!confirmed) return;
    removeZone(zone);
  }

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">{t('Clocks')}</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        {t('Up to three world clocks, shown beneath the date on the Dashboard.')}
      </p>

      {zones.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {zones.map((zone) => (
            <li
              key={zone}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{timeZoneLabel(zone)}</p>
                <p className="truncate text-[11px] text-zinc-500">
                  {zone} · {formatClockDay(zone, now, intlLocale)} · {formatClockOffset(zone, now, intlLocale)}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900">
                {formatClockTime(zone, now, intlLocale)}
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleRemove(zone);
                }}
                aria-label={t('Remove {name}', { name: timeZoneLabel(zone) })}
                title={t('Remove clock')}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-1.5">
        <label htmlFor={pickerId} className="text-[11px] text-zinc-500">
          {t('Add a time zone')}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[240px] flex-1">
            <TimeZonePicker
              id={pickerId}
              value={draft}
              onChange={(next) => {
                setDraft(next);
                setError(null);
              }}
              onPick={addClock}
              added={zones}
              now={now}
              locale={intlLocale}
              disabled={atLimit}
            />
          </div>
          <Button type="submit" variant="primary" disabled={atLimit || draft.trim() === ''}>
            {t('Add Clock')}
          </Button>
        </div>
        <span className="text-[11px] text-zinc-500">
          {t('Search by city, region or offset (GMT+8). {count} of {total} used.', {
            count: zones.length,
            total: MAX_CLOCKS,
          })}
        </span>
      </form>

      {atLimit && (
        <p className="mt-2 text-xs text-zinc-500">
          {t('Maximum of {total} time zones reached. Remove one to add another.', {
            total: MAX_CLOCKS,
          })}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

function KeyBindingsSection() {
  const t = useT();
  const { bindings, setBinding, resetBinding, resetAll } = useKeybindingsStore();
  const [recording, setRecording] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recordButtonRef = useRef<HTMLButtonElement | null>(null);

  function startRecording(id: string) {
    setRecording(id);
    setRecordingError(null);
  }

  /**
   * Safari does not give buttons keyboard focus when clicked, so a button
   * `onKeyDown` never fires there. Listen on the window instead. The capture
   * phase also stops an in-progress chord from triggering global hotkeys.
   */
  useEffect(() => {
    if (!recording) return;
    const id = recording;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      const bare = ['Control', 'Meta', 'Alt', 'Shift'];
      if (bare.includes(e.key)) return;

      const key = e.key.toLowerCase();
      if (key === 'escape') {
        setRecording(null);
        setRecordingError(null);
        return;
      }

      // Record every modifier the user pressed, so chords such as ⌃⌥⇧⌘A stay
      // exactly as entered. Order follows the Apple glyph order ⌃⌥⇧⌘.
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      if (e.metaKey) parts.push('meta');
      parts.push(key === ' ' ? 'space' : key);

      const newBinding = parts.join('+');
      const target = ALL_SHORTCUTS.find((shortcut) => shortcut.id === id);
      if (!target?.allowBareKey && parts.length === 1 && newBinding.length === 1) {
        setRecordingError(t('Include a modifier key (⌘ / Ctrl) to avoid conflicts.'));
        return;
      }

      const conflict = ALL_SHORTCUTS.find(
        (other) =>
          other.id !== id &&
          (bindings[other.id] ?? other.defaultBinding) === newBinding,
      );
      if (conflict) {
        setRecordingError(t('Already used by “{name}”.', { name: t(conflict.label) }));
        return;
      }

      setBinding(id, newBinding);
      setRecording(null);
      setRecordingError(null);
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [recording, bindings, setBinding, t]);

  // Focus the recorder so the focus ring is visible and clicking away cancels.
  useEffect(() => {
    if (recording) recordButtonRef.current?.focus();
  }, [recording]);

  const hasCustom = ALL_SHORTCUTS.some(
    (s) => s.configurable && bindings[s.id] && bindings[s.id] !== s.defaultBinding,
  );

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-zinc-900">{t('Key Bindings')}</h2>
          <p className="mt-1 max-w-[480px] text-xs text-zinc-500">
            {t(
              'Keyboard shortcuts available in the app. Click a configurable shortcut to change it.',
            )}
          </p>
        </div>
        {hasCustom && (
          <button
            type="button"
            className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700"
            onClick={resetAll}
          >
            {t('Reset All')}
          </button>
        )}
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {ALL_SHORTCUTS.map((shortcut) => {
          const current = shortcut.configurable
            ? (bindings[shortcut.id] ?? shortcut.defaultBinding)
            : shortcut.defaultBinding;
          const isCustom = shortcut.configurable && current !== shortcut.defaultBinding;
          const isRecording = recording === shortcut.id;

          return (
            <li key={shortcut.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{t(shortcut.label)}</p>
                <p className="text-xs text-zinc-500">{t(shortcut.description)}</p>
                {isRecording && recordingError && (
                  <p className="mt-0.5 text-xs text-red-500">{recordingError}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {shortcut.configurable ? (
                  isRecording ? (
                    <button
                      ref={recordButtonRef}
                      type="button"
                      className="flex min-w-[160px] items-center justify-center rounded-lg border-2 border-blue-400 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 outline-none ring-2 ring-blue-300 ring-offset-1"
                      autoFocus
                      onBlur={() => { setRecording(null); setRecordingError(null); }}
                    >
                      {t('Press keys… (Esc to cancel)')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white"
                      onClick={() => { startRecording(shortcut.id); }}
                      title={t('Click to Change')}
                    >
                      <Kbd>{bindingLabel(current)}</Kbd>
                      {isCustom && (
                        <span className="ml-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700">{t('custom')}</span>
                      )}
                    </button>
                  )
                ) : (
                  <Kbd>{bindingLabel(current)}</Kbd>
                )}

                {shortcut.configurable && isCustom && !isRecording && (
                  <button
                    type="button"
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                    onClick={() => { resetBinding(shortcut.id); }}
                    title={t('Reset to Default')}
                  >
                    {t('Reset')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * DESIGN §5.5 *Privacy*: the excluded projects are toggled in the project
 * dialog; this section shows which ones are left out of AI requests (FR-25).
 */
function PrivacySection() {
  const t = useT();
  const projects = useProjects();
  const excluded = (projects.data?.projects ?? []).filter((project) => project.aiExcluded);

  return (
    <section className="mt-8 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">{t('Privacy')}</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        {t(
          'Excluded projects and their tasks are left out of every AI request. Change it in a project’s settings.',
        )}
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
        <p className="mt-3 text-sm text-zinc-500">{t('No projects are excluded.')}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {excluded.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="text-[13px] text-blue-600 hover:underline"
              >
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
