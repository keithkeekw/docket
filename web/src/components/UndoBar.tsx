import { useEffect, useRef, useState } from 'react';
import { useUndo } from '../api/undo';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { useUiStore } from '../store/ui';

/** Matches the `duration-300` transition below. */
const LEAVE_MS = 300;

/**
 * DESIGN §6 forbids toasts that vanish, so the undo offer stays on screen until
 * the next destructive action or a reload (FR-29). Undo and Dismiss fade it out.
 */
export function UndoBar() {
  const t = useT();
  const label = useUiStore((state) => state.undoLabel);
  const clearUndo = useUiStore((state) => state.clearUndo);
  const undo = useUndo();
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<number | null>(null);

  // A new destructive action replaces the bar, so cancel any fade in progress.
  useEffect(() => {
    setLeaving(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [label]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  if (!label) return null;

  function leave() {
    setLeaving(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      clearUndo();
    }, LEAVE_MS);
  }

  return (
    <div
      className={cx(
        'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none',
        leaving ? 'mb-0 grid-rows-[0fr] opacity-0' : 'mb-4 grid-rows-[1fr] opacity-100',
      )}
    >
      <div className="overflow-hidden">
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          <span className="font-medium">{t(label)}</span>

          <button
            type="button"
            className="font-semibold text-red-800 underline underline-offset-2 hover:text-red-700 disabled:opacity-60"
            disabled={undo.isPending || leaving}
            onClick={() => {
              undo.mutate(undefined, { onSuccess: leave });
            }}
          >
            {undo.isPending ? t('Undoing…') : t('Undo')}
          </button>

          <button
            type="button"
            className="ml-1 text-red-700 underline underline-offset-2 hover:text-red-800 disabled:opacity-60"
            disabled={leaving}
            onClick={leave}
          >
            {t('Dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
