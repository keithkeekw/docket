import { cx } from '../lib/cx';

/** DESIGN §4: 12 px / 500 label + count; overdue label is orange-700. */
export function GroupHeader({
  label,
  count,
  tone = 'default',
}: {
  label: string;
  count: number;
  tone?: 'default' | 'overdue';
}) {
  return (
    <div className="flex items-baseline gap-2 px-3 pt-3 pb-1">
      <h3
        className={cx(
          'text-xs font-medium',
          tone === 'overdue' ? 'text-orange-700' : 'text-zinc-500',
        )}
      >
        {label}
      </h3>
      <span className="text-xs text-zinc-500">{count}</span>
    </div>
  );
}
