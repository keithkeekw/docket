import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link } from 'react-router';
import { useHotkeys } from 'react-hotkeys-hook';
import { ApiError } from '../api/client';
import { useCaptureWithAi } from '../api/proposals';
import { useCreateTask } from '../api/tasks';
import { useT } from '../lib/i18n';
import { parseTaskInput } from '../lib/parseTask';
import { bindingLabel, matchesBinding } from '../lib/platform';
import { useKeybindingsStore } from '../store/keybindings';
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
  const t = useT();
  const isOpen = useUiStore((state) => state.captureOpen);
  const captureProjectId = useUiStore((state) => state.captureProjectId);
  const captureStatusId = useUiStore((state) => state.captureStatusId);
  const openCapture = useUiStore((state) => state.openCapture);
  const closeCapture = useUiStore((state) => state.closeCapture);
  const openProposal = useUiStore((state) => state.openProposal);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closedRef = useRef(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const createTask = useCreateTask();
  const captureWithAi = useCaptureWithAi();

  const quickCaptureKey = useKeybindingsStore((s) => s.bindings.quickCapture ?? 'mod+k');
  const aiCaptureKey = useKeybindingsStore((s) => s.bindings.aiCapture ?? 'mod+enter');

  // Works from any screen, including while typing in another field.
  useHotkeys(
    quickCaptureKey,
    () => {
      openCapture();
    },
    { preventDefault: true, enableOnFormTags: true },
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      closedRef.current = false;
      if (!dialog.open) {
        setTitle('');
        setError(null);
        setNeedsSettings(false);
        dialog.showModal();
      }
      inputRef.current?.focus();
    } else {
      // Esc while the model is thinking: drop the result when it arrives.
      closedRef.current = true;
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;

    try {
      await createTask.mutateAsync({
        ...parseTaskInput(trimmed),
        projectId: captureProjectId ?? undefined,
        statusId: captureStatusId ?? undefined,
      });
      closeCapture();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not save the task'));
    }
  }

  /**
   * DESIGN §5.4: Ctrl/⌘ Enter asks the model for a proposal. Nothing is saved
   * here — the result opens the preview modal (FR-23).
   */
  async function runAi() {
    const trimmed = title.trim();
    if (!trimmed || aiPending) return;

    setAiPending(true);
    setError(null);

    try {
      const proposal = await captureWithAi.mutateAsync({ text: trimmed });
      if (closedRef.current) return;
      openProposal(proposal);
      closeCapture();
    } catch (cause) {
      if (closedRef.current) return;
      setError(cause instanceof Error ? cause.message : t('Could not reach the AI provider'));
      setNeedsSettings(cause instanceof ApiError && cause.status === 503);
    } finally {
      setAiPending(false);
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
          {t('Quick Capture')}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {captureProjectId ? t('Saves to this project.') : t('Saves to the Inbox.')}
        </p>

        <input
          ref={inputRef}
          className="mt-3 min-h-11 w-full rounded-[10px] border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-500"
          placeholder={t('What needs doing?')}
          aria-label={t('Task Title')}
          value={title}
          disabled={aiPending}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (matchesBinding(event, aiCaptureKey)) {
              event.preventDefault();
              void runAi();
            }
          }}
        />

        {error &&
          (needsSettings ? (
            <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700">
              {error}{' '}
              <Link to="/settings" className="text-blue-600 hover:underline" onClick={closeCapture}>
                {t('Open Settings')}
              </Link>
            </p>
          ) : (
            <InlineError message={error} />
          ))}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            <Kbd>Enter</Kbd> {t('to add')} · <Kbd>{bindingLabel(aiCaptureKey)}</Kbd> {t('for AI')} ·{' '}
            <Kbd>Esc</Kbd> {t('to close')}
          </span>
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || createTask.isPending || aiPending}
          >
            {aiPending
              ? t('Thinking…')
              : createTask.isPending
                ? t('Saving…')
                : captureProjectId
                  ? t('Add Task')
                  : t('Add to Inbox')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
