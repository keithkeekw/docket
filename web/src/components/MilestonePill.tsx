import type { Milestone } from '@app/shared';
import { cx } from '../lib/cx';

/**
 * DESIGN §4 MilestonePill: rounded-full, 40 px tall, 13 px. The current
 * milestone is blue-tinted; the state text reads "Done", "7 of 12" or
 * "Not started" so meaning never rests on colour alone.
 */
export function MilestonePill({
  milestone,
  current = false,
  selected = false,
  onSelect,
}: {
  milestone: Milestone;
  current?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const state = milestone.completedAt
    ? 'Done'
    : milestone.total > 0
      ? `${milestone.done} of ${milestone.total}`
      : 'Not Started';

  const className = cx(
    'inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px]',
    current || selected ? 'border-blue-200 bg-blue-50' : 'border-zinc-200 bg-white',
  );

  const content = (
    <>
      <span className={cx('font-medium text-zinc-900', milestone.completedAt && 'text-zinc-500')}>
        {milestone.name}
      </span>
      <span className="text-zinc-600">{state}</span>
    </>
  );

  if (!onSelect) {
    return <span className={className}>{content}</span>;
  }

  return (
    <button type="button" aria-pressed={selected} className={className} onClick={onSelect}>
      {content}
    </button>
  );
}

/** DESIGN §4: "Add milestone" uses a dashed zinc-300 border. */
export function AddMilestonePill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center rounded-full border border-dashed border-zinc-300 px-3.5 text-[13px] text-zinc-600"
      onClick={onClick}
    >
      Add Milestone
    </button>
  );
}
