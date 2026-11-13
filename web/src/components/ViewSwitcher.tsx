import { cx } from '../lib/cx';

export type ViewMode = 'list' | 'table' | 'kanban';

const OPTIONS: ReadonlyArray<{ value: ViewMode; label: string }> = [
  { value: 'list', label: 'List' },
  { value: 'table', label: 'Table' },
  { value: 'kanban', label: 'Kanban' },
];

/**
 * DESIGN §4: segmented control on a zinc-100 track; the active tab is white
 * with `shadow-sm`. `aria-pressed` exposes the selection (NFR-7).
 */
export function ViewSwitcher({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className={cx('inline-flex items-center gap-[3px] rounded-lg bg-zinc-100 p-[3px]', className)}
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onChange(option.value);
            }}
            className={cx(
              'min-h-9 rounded-md px-3.5 text-[13px]',
              active ? 'bg-white font-medium text-zinc-900 shadow-sm' : 'text-zinc-600',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
