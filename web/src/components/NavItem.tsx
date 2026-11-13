import { NavLink } from 'react-router';
import { cx } from '../lib/cx';

/**
 * DESIGN §4 Sidebar / NavItem: 40 px row, 14 px text, right-aligned count in
 * `text-xs text-zinc-500`, active row on `bg-zinc-100` with medium weight.
 * Project rows reuse the same row with a decorative dot.
 */
export function NavItem({
  to,
  label,
  count,
  end = false,
  dot = false,
}: {
  to: string;
  label: string;
  count?: number;
  end?: boolean;
  dot?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm',
          isActive ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600',
        )
      }
    >
      {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-zinc-400" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && <span className="text-xs text-zinc-500">{count}</span>}
    </NavLink>
  );
}
