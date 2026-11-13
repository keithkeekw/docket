import { useEffect, useRef, type MouseEvent } from 'react';
import { useT } from '../lib/i18n';
import { useConfirmStore } from '../store/confirm';
import { Button } from './Button';

/**
 * One overlay confirmation dialog for every destructive delete. Focus starts
 * on Cancel, Esc and the backdrop cancel, so the safe action is the default.
 */
export function ConfirmDialog() {
  const t = useT();
  const options = useConfirmStore((state) => state.options);
  const respond = useConfirmStore((state) => state.respond);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const isOpen = options !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) respond(false);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      className="m-auto w-[min(460px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        respond(false);
      }}
      onClose={() => {
        if (isOpen) respond(false);
      }}
    >
      <div className="p-5">
        <h2 id="confirm-title" className="text-[15px] font-semibold text-zinc-900">
          {options?.title ?? t('Delete')}
        </h2>
        <p id="confirm-message" className="mt-2 text-sm leading-relaxed text-zinc-600">
          {options?.message ?? ''}
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            ref={cancelRef}
            onClick={() => { respond(false); }}
          >
            {options?.cancelLabel ?? t('Cancel')}
          </Button>
          <Button variant="danger" onClick={() => { respond(true); }}>
            {options?.confirmLabel ?? t('Delete')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
