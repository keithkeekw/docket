import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useT } from '../lib/i18n';
import { bindingLabel } from '../lib/platform';
import { ALL_SHORTCUTS, useKeybindingsStore } from '../store/keybindings';
import { Kbd } from './Kbd';

/**
 * Shift + Space: a dimmed overlay listing every app shortcut. Binding strings
 * come from the keybindings store so the sheet always reflects the user's own
 * rebinds.
 */
export function ShortcutHelpDialog() {
  const t = useT();
  const bindings = useKeybindingsStore((s) => s.bindings);
  const helpKey = bindings.shortcutHelp ?? 'shift+space';

  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Form fields are exempt so typing a shifted space never opens the sheet.
  useHotkeys(
    helpKey,
    () => { setIsOpen((open) => !open); },
    { preventDefault: true },
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) setIsOpen(false);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="shortcut-help-title"
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        setIsOpen(false);
      }}
      onClose={() => {
        if (isOpen) setIsOpen(false);
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
        <div>
          <h2 id="shortcut-help-title" className="text-[15px] font-semibold text-zinc-900">
            {t('Keyboard Shortcuts')}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {t('Every shortcut in the app, using your current bindings.')}
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          className="shrink-0 text-zinc-400 hover:text-zinc-600"
          onClick={() => { setIsOpen(false); }}
          aria-label={t('Close')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <ul className="max-h-[min(60vh,520px)] divide-y divide-zinc-100 overflow-y-auto overscroll-contain px-5">
        {ALL_SHORTCUTS.map((shortcut) => (
          <li
            key={shortcut.id}
            className="flex items-center justify-between gap-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm text-zinc-900">{t(shortcut.label)}</p>
              <p className="text-xs text-zinc-500">{t(shortcut.description)}</p>
            </div>
            <Kbd>{bindingLabel(bindings[shortcut.id] ?? shortcut.defaultBinding)}</Kbd>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500">
        <Kbd>{bindingLabel(helpKey)}</Kbd> {t('to toggle this list')} ·
        <Kbd>Esc</Kbd> {t('to close')}
      </div>
    </dialog>
  );
}
