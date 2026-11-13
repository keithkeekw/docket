import { useT } from '../lib/i18n';

/**
 * DESIGN §6 "AI error" / "Saving": an inline message that stays on screen —
 * what failed, plus an optional retry. Never a toast that disappears.
 */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700">
      <span className="whitespace-pre-wrap">{message}</span>
      {onRetry && (
        <button
          type="button"
          className="font-medium text-zinc-900 underline underline-offset-2"
          onClick={onRetry}
        >
          {t('Retry')}
        </button>
      )}
    </div>
  );
}
