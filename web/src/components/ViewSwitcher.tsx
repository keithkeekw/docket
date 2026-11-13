import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { PrelineTooltip } from './PrelineTooltip';

export type ViewMode = 'list' | 'table' | 'kanban';

type ViewOption = {
  value: ViewMode;
  label: string;
  icon: ReactNode;
};

const OPTIONS: ReadonlyArray<ViewOption> = [
  {
    value: 'list',
    label: 'List',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
        <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 2 4.75Zm0 5.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    value: 'table',
    label: 'Table',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
        <path fillRule="evenodd" d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5ZM3.25 4.5a.75.75 0 0 0-.75.75v2.25h15V5.25a.75.75 0 0 0-.75-.75H3.25ZM18.25 9H15v3.5h3.25V9Zm0 5h-3.25v1.5h1.75a.75.75 0 0 0 .75-.75V14Zm-4.75 1.5V14H9.5v1.5h4ZM8 15.5V14H1.75v.75c0 .414.336.75.75.75H8Zm-6.25-3H8V9H1.75v3.5ZM9.5 9v3.5h4V9h-4Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    value: 'kanban',
    label: 'Kanban',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
        <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h2A1.5 1.5 0 0 1 8 3.5v13A1.5 1.5 0 0 1 6.5 18h-2A1.5 1.5 0 0 1 3 16.5v-13ZM9 3.5A1.5 1.5 0 0 1 10.5 2h2A1.5 1.5 0 0 1 14 3.5v13A1.5 1.5 0 0 1 12.5 18h-2A1.5 1.5 0 0 1 9 16.5v-13ZM15 3.5A1.5 1.5 0 0 1 16.5 2h.5A1.5 1.5 0 0 1 18.5 3.5v13A1.5 1.5 0 0 1 17 18h-.5a1.5 1.5 0 0 1-1.5-1.5v-13Z" />
      </svg>
    ),
  },
];

/**
 * DESIGN §4: segmented icon control on a zinc-100 track; the active tab is
 * white with `shadow-sm`. `aria-pressed` exposes the selection (NFR-7) and the
 * icon buttons carry tooltips for sighted users.
 */
export function ViewSwitcher({
  value,
  onChange,
  className,
  views = ['list', 'table', 'kanban'],
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
  /** Limit the control to the views a screen actually supports. */
  views?: ReadonlyArray<ViewMode>;
}) {
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t('View mode')}
      className={cx('inline-flex items-center gap-[3px] rounded-lg bg-zinc-100 p-[3px]', className)}
    >
      {OPTIONS.filter((option) => views.includes(option.value)).map((option) => {
        const active = option.value === value;
        const label = t('{view} View', { view: t(option.label) });
        return (
          <PrelineTooltip key={option.value} label={label}>
            <button
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => {
                onChange(option.value);
              }}
              className={cx(
                'inline-flex size-9 items-center justify-center rounded-md',
                active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900',
              )}
            >
              {option.icon}
            </button>
          </PrelineTooltip>
        );
      })}
    </div>
  );
}
