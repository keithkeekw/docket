import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

type BadgeVariant = 'soft' | 'outline';

const BASE = 'inline-flex items-center rounded-md text-xs';
const VARIANTS: Record<BadgeVariant, string> = {
  soft: 'bg-zinc-100 px-2 py-0.5 text-zinc-700',
  outline: 'border border-zinc-200 px-1.5 text-zinc-700',
};

/** DESIGN §4: soft and outline badges, restyled from Preline's Badge. */
export function Badge({
  variant = 'soft',
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cx(BASE, VARIANTS[variant], className)}>{children}</span>;
}

/** Project name or "Inbox" (DESIGN §4). */
export function LocationChip({ children }: { children: ReactNode }) {
  return <Badge variant="soft">{children}</Badge>;
}

/** Table view status cell (DESIGN §4). */
export function StatusChip({ children }: { children: ReactNode }) {
  return <Badge variant="soft">{children}</Badge>;
}

/**
 * Tags reuse the LocationChip treatment (PROGRESS D9). DESIGN has no separate
 * tag component; the shape stays consistent with other row chips.
 */
export function TagChip({ children }: { children: ReactNode }) {
  return <Badge variant="soft">{children}</Badge>;
}

/** Short ticket ID derived from the URL on save (FR-16, US-12). */
export function LinkBadge({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cx(BASE, VARIANTS.outline, 'hover:underline')}
    >
      {children}
    </a>
  );
}
