import { describe, expect, it } from 'vitest';
import { buildTimeline } from './timeline';

function milestone(id: string, position: number, completedAt: string | null = null) {
  return { id, name: `Milestone ${id}`, position, completedAt, done: 0, total: 0 };
}

function task(milestoneId: string | null, startDate: string | null, endDate: string | null) {
  return { milestoneId, startDate, endDate };
}

describe('buildTimeline', () => {
  it('needs at least one milestone', () => {
    expect(buildTimeline([], [task(null, '2026-11-01', null)])).toEqual({
      status: 'no-milestones',
    });
  });

  it('refuses to draw when no task in the first milestone has a start date', () => {
    const result = buildTimeline(
      [milestone('b', 2), milestone('a', 1)],
      [task('a', null, '2026-11-10'), task('b', '2026-11-01', '2026-11-20')],
    );
    expect(result).toEqual({ status: 'no-start', firstMilestone: 'Milestone a' });
  });

  it('runs from the first milestone start to the last milestone end', () => {
    const result = buildTimeline(
      [milestone('a', 1, '2026-11-12T00:00:00Z'), milestone('b', 2), milestone('c', 3)],
      [
        task('a', '2026-11-05', '2026-11-12'),
        task('a', '2026-11-03', null),
        task('b', '2026-11-13', '2026-11-18'),
        task('c', null, '2026-11-30'),
        task(null, '2026-10-01', '2026-12-31'),
      ],
    );
    expect(result).toMatchObject({
      status: 'ready',
      start: '2026-11-03',
      end: '2026-11-30',
      hasEnd: true,
    });
    if (result.status !== 'ready') return;
    expect(result.rows.map((row) => [row.id, row.start, row.end, row.completed])).toEqual([
      ['a', '2026-11-03', '2026-11-12', true],
      ['b', '2026-11-13', '2026-11-18', false],
      ['c', null, '2026-11-30', false],
    ]);
  });

  it('is fine without an end date in the last milestone', () => {
    const result = buildTimeline(
      [milestone('a', 1), milestone('b', 2)],
      [task('a', '2026-11-03', '2026-11-09'), task('b', null, null)],
    );
    expect(result).toMatchObject({ status: 'ready', end: '2026-11-09', hasEnd: false });
  });

  it('stretches to a middle milestone that ends after the last one', () => {
    const result = buildTimeline(
      [milestone('a', 1), milestone('b', 2), milestone('c', 3)],
      [task('a', '2026-11-03', null), task('b', null, '2026-12-15'), task('c', null, '2026-12-01')],
    );
    expect(result).toMatchObject({ status: 'ready', end: '2026-12-15', hasEnd: true });
  });
});
