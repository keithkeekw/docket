import type { Milestone } from '@app/shared';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';

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
  const t = useT();
  const state = milestone.completedAt
    ? t('Done')
    : milestone.total > 0
      ? t('{done} of {total}', { done: milestone.done, total: milestone.total })
      : t('Not Started');

  const className = cx(
    'inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px]',
    selected ? 'border-blue-300 bg-blue-50' : 'border-zinc-200 bg-white',
  );

  const content = (
    <>
      {current && (
        <>
          <span
            aria-hidden="true"
            title={t('Current milestone')}
            className="size-1.5 shrink-0 rounded-full bg-blue-600"
          />
          <span className="sr-only">{t('Current milestone')}</span>
        </>
      )}
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
  const t = useT();

  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center rounded-full border border-dashed border-zinc-300 px-3.5 text-[13px] text-zinc-600"
      onClick={onClick}
    >
      {t('Add Milestone')}
    </button>
  );
}
