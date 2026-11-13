import { useUndo } from '../api/undo';
import { useUiStore } from '../store/ui';

/**
 * DESIGN §6 forbids toasts that vanish, so the undo offer stays on screen until
 * the next destructive action or a reload (FR-29).
 */
export function UndoBar() {
  const label = useUiStore((state) => state.undoLabel);
  const clearUndo = useUiStore((state) => state.clearUndo);
  const undo = useUndo();

  if (!label) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
      <span>{label}</span>

      <button
        type="button"
        className="font-medium text-zinc-900 underline underline-offset-2"
        disabled={undo.isPending}
        onClick={() => {
          undo.mutate(undefined, {
            onSuccess: () => {
              clearUndo();
            },
          });
        }}
      >
        {undo.isPending ? 'Undoing…' : 'Undo'}
      </button>

      <button
        type="button"
        className="ml-1 text-zinc-500 underline underline-offset-2"
        onClick={clearUndo}
      >
        Dismiss
      </button>
    </div>
  );
}
