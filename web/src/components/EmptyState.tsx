import type { ReactNode } from 'react';

/**
 * DESIGN §6 empty list: one line of zinc-500 text plus at most one secondary
 * action. No illustrations, no dashed boxes.
 */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-5 py-6">
      <p className="text-sm text-zinc-500">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
