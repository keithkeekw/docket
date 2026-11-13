import { cx } from '../lib/cx';
import { describeDue } from '../lib/due';

type DueLabelVariant = 'list' | 'table';

/**
 * DESIGN §4: 12 px; orange-700 when overdue, else zinc-500 in List and
 * zinc-700 in Table. `now` is injectable so the component stays deterministic
 * in tests and galleries.
 */
export function DueLabel({
  dueDate,
  dueTime = null,
  variant = 'list',
  now,
}: {
  dueDate: string | null;
  dueTime?: string | null;
  variant?: DueLabelVariant;
  now?: Date;
}) {
  if (!dueDate) return null;

  const due = describeDue(dueDate, dueTime, now);

  return (
    <span
      className={cx(
        'text-xs',
        due.overdue ? 'text-orange-700' : variant === 'table' ? 'text-zinc-700' : 'text-zinc-500',
      )}
      title={due.absolute}
    >
      {due.label}
    </span>
  );
}
