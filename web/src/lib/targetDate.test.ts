import { describe, expect, it } from 'vitest';
import { isPastTargetDate } from './targetDate';

function task(
  startDate: string | null,
  dueDate: string | null,
  statusCategory: 'open' | 'done' = 'open',
) {
  return { startDate, dueDate, statusCategory } as const;
}

describe('isPastTargetDate', () => {
  it('flags a start date after the target date', () => {
    expect(isPastTargetDate(task('2026-12-02', null), '2026-12-01')).toBe(true);
  });

  it('flags a due date after the target date', () => {
    expect(isPastTargetDate(task(null, '2026-12-05'), '2026-12-01')).toBe(true);
  });

  it('allows dates on or before the target date', () => {
    expect(isPastTargetDate(task('2026-11-20', '2026-12-01'), '2026-12-01')).toBe(false);
  });

  it('ignores projects without a target date and undated tasks', () => {
    expect(isPastTargetDate(task('2027-01-01', null), null)).toBe(false);
    expect(isPastTargetDate(task(null, null), '2026-12-01')).toBe(false);
  });

  it('leaves completed tasks alone', () => {
    expect(isPastTargetDate(task(null, '2026-12-05', 'done'), '2026-12-01')).toBe(false);
  });
});
