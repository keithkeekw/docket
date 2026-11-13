import { cx } from '../lib/cx';

export type Priority = 1 | 2 | 3;

const TONES: Record<Priority, string> = {
  1: 'text-orange-700',
  2: 'text-blue-600',
  3: 'text-zinc-500',
};

/** DESIGN §4: text only, 12 px / 500. */
export function PriorityLabel({ priority }: { priority: Priority }) {
  return <span className={cx('text-xs font-medium', TONES[priority])}>P{priority}</span>;
}
