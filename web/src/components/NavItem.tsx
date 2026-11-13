import type { ReactNode } from 'react';
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
  collapsed = false,
  icon,
}: {
  to: string;
  label: string;
  count?: number;
  end?: boolean;
  dot?: boolean;
  collapsed?: boolean;
  icon?: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-tooltip={collapsed ? label : undefined}
      className={({ isActive }) =>
        cx(
          'flex min-h-10 items-center rounded-lg text-sm',
          collapsed ? 'justify-center px-2' : 'gap-2 px-3',
          isActive ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600',
        )
      }
    >
      {collapsed ? (
        icon ?? (dot ? (
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-zinc-400" />
        ) : (
          <span aria-hidden="true" className="text-base leading-none">{label[0]}</span>
        ))
      ) : (
        <>
          {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-zinc-400" />}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span className="relative inline-flex min-w-4 items-center justify-center tabular-nums">
              <span
                aria-hidden="true"
                className="absolute inline-flex size-full animate-ping rounded-full bg-zinc-400/50 [animation-duration:2.5s] motion-reduce:animate-none"
              />
              <span className="relative text-xs text-zinc-500">{count}</span>
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
