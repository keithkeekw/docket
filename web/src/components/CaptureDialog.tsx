import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useCreateTask } from '../api/tasks';
import { modKeyLabel } from '../lib/platform';
import { useUiStore } from '../store/ui';
import { Button } from './Button';
import { InlineError } from './InlineError';
import { Kbd } from './Kbd';

/**
 * DESIGN §5.4 plain capture: one field, Enter saves straight to the Inbox and
 * the modal closes. AI parsing (`Ctrl Enter`) is M2.
 *
 * A native `<dialog>` supplies the focus trap, Esc handling and top-layer
 * stacking without shipping Preline's JS (PROGRESS D26).
 */
export function CaptureDialog() {
  const isOpen = useUiStore((state) => state.captureOpen);
  const captureProjectId = useUiStore((state) => state.captureProjectId);
  const captureStatusId = useUiStore((state) => state.captureStatusId);
  const openCapture = useUiStore((state) => state.openCapture);
  const closeCapture = useUiStore((state) => state.closeCapture);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createTask = useCreateTask();

  // Works from any screen, including while typing in another field.
  useHotkeys('mod+k', () => {
    openCapture();
  }, { preventDefault: true, enableOnFormTags: true });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        setTitle('');
        setError(null);
        dialog.showModal();
      }
      inputRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;

    try {
      await createTask.mutateAsync({
        title: trimmed,
        projectId: captureProjectId ?? undefined,
        statusId: captureStatusId ?? undefined,
      });
      closeCapture();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the task');
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeCapture();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="capture-title"
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdropClick}
      onCancel={(event) => {
        event.preventDefault();
        closeCapture();
      }}
      onClose={() => {
        if (isOpen) closeCapture();
      }}
    >
      <form className="p-4" onSubmit={handleSubmit}>
        <h2 id="capture-title" className="text-[15px] font-semibold text-zinc-900">
          Quick capture
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {captureProjectId ? 'Saves to this project.' : 'Saves to the Inbox.'}
        </p>

        <input
          ref={inputRef}
          className="mt-3 min-h-11 w-full rounded-[10px] border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-500"
          placeholder="What needs doing?"
          aria-label="Task title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
        />

        {error && <InlineError message={error} />}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Kbd>Enter</Kbd> to add · <Kbd>Esc</Kbd> to close
          </span>
          <Button type="submit" variant="primary" disabled={!title.trim() || createTask.isPending}>
            {createTask.isPending ? 'Saving…' : captureProjectId ? 'Add task' : 'Add to Inbox'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

/** The shortcut hint shown beside capture entry points. */
export function CaptureHint() {
  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <Kbd>{modKeyLabel()} K</Kbd> to capture
    </span>
  );
}
