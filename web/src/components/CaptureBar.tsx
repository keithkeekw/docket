import { useRef, useState, type FormEvent } from 'react';
import { useCreateTask } from '../api/tasks';
import { useT } from '../lib/i18n';
import { parseTaskInput } from '../lib/parseTask';
import { modKeyLabel } from '../lib/platform';
import { Kbd } from './Kbd';

/**
 * DESIGN §4 CaptureBar: white bar, 10 px radius, 48 px tall, "+" on the left,
 * borderless input, shortcut chip on the right. Enter saves straight to the
 * Inbox (FR-2); anything smarter is M2.
 */
export function CaptureBar() {
  const t = useT();
  const createTask = useCreateTask();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;

    try {
      await createTask.mutateAsync(parseTaskInput(trimmed));
      setTitle('');
      setError(null);
      inputRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not save the task'));
    }
  }

  return (
    <div>
      <form
        className="flex min-h-12 items-center gap-2 rounded-[10px] border border-zinc-200 bg-white px-3 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2"
        onSubmit={handleSubmit}
      >
        <span aria-hidden="true" className="text-sm text-zinc-500">
          +
        </span>

        <input
          ref={inputRef}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-zinc-900 placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:outline-none"
          aria-label={t('Quick Capture')}
          placeholder={t('What needs doing?')}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
        />

        <Kbd>{modKeyLabel()} K</Kbd>
      </form>

      {error && <p className="mt-2 text-xs text-zinc-700">{error}</p>}
    </div>
  );
}
