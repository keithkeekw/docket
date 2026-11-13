import type { ReactNode } from 'react';

/** DESIGN §4: subtle keyboard chip. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600">
      {children}
    </kbd>
  );
}
