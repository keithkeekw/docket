import { cx } from '../lib/cx';

/**
 * Red dot pinned to the top-right of its `relative` parent, pulsing like the
 * sidebar task counts. Decorative: the parent's label announces the update.
 */
export function UpdateBadge({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('absolute top-1 right-1 flex size-2.5', className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-300/60 [animation-duration:2.5s] motion-reduce:animate-none" />
      <span className="relative inline-flex size-2.5 rounded-full border-2 border-white bg-red-500" />
    </span>
  );
}
