import { describe, expect, it } from 'vitest';
import {
  hasActiveFilters,
  resolveDueRange,
  taskFilterQuery,
  type TaskFilter,
} from './taskFilters';

describe('taskFilterQuery', () => {
  it('returns an empty string for no filter', () => {
    expect(taskFilterQuery({})).toBe('');
  });

  it('serialises every filter the server understands', () => {
    const filter: TaskFilter = {
      project: 'p1',
      statusIds: ['s2', 's1'],
      priorities: [3, 1],
      dueFrom: '2026-11-01',
      dueTo: '2026-11-30',
      q: 'vendor',
      tag: 'Vendor',
    };

    expect(taskFilterQuery(filter)).toBe(
      '?project=p1&status=s1%2Cs2&priority=1%2C3&due_from=2026-11-01&due_to=2026-11-30&q=vendor&tag=Vendor',
    );
  });

  it('is stable regardless of selection order, so cache keys match', () => {
    const a = taskFilterQuery({ statusIds: ['b', 'a'], priorities: [2, 1] });
    const b = taskFilterQuery({ statusIds: ['a', 'b'], priorities: [1, 2] });

    expect(a).toBe(b);
  });

  it('treats the Inbox as an explicit project value', () => {
    expect(taskFilterQuery({ project: 'none' })).toBe('?project=none');
  });
});

describe('resolveDueRange', () => {
  const now = new Date(2026, 10, 15, 9, 30); // Sun 15 Nov 2026, local

  it('maps overdue to everything before today', () => {
    expect(resolveDueRange('overdue', now)).toEqual({ dueTo: '2026-11-14' });
  });

  it('maps today to a single day', () => {
    expect(resolveDueRange('today', now)).toEqual({
      dueFrom: '2026-11-15',
      dueTo: '2026-11-15',
    });
  });

  it('maps the next week to today plus seven days', () => {
    expect(resolveDueRange('week', now)).toEqual({
      dueFrom: '2026-11-15',
      dueTo: '2026-11-22',
    });
  });

  it('leaves the query open for "any"', () => {
    expect(resolveDueRange('any', now)).toEqual({});
  });

  it('rolls over at midnight', () => {
    const lateNight = new Date(2026, 10, 15, 23, 59);
    const justAfter = new Date(2026, 10, 16, 0, 1);

    expect(resolveDueRange('today', lateNight).dueFrom).toBe('2026-11-15');
    expect(resolveDueRange('today', justAfter).dueFrom).toBe('2026-11-16');
  });
});

describe('hasActiveFilters', () => {
  it('is false for an empty filter', () => {
    expect(hasActiveFilters({})).toBe(false);
  });

  it('is true for each narrowing field', () => {
    expect(hasActiveFilters({ q: 'a' })).toBe(true);
    expect(hasActiveFilters({ statusIds: ['s1'] })).toBe(true);
    expect(hasActiveFilters({ priorities: [1] })).toBe(true);
    expect(hasActiveFilters({ dueFrom: '2026-11-01' })).toBe(true);
    expect(hasActiveFilters({ tag: 'Vendor' })).toBe(true);
    expect(hasActiveFilters({ project: 'none' })).toBe(true);
  });

  it('ignores empty arrays', () => {
    expect(hasActiveFilters({ statusIds: [], priorities: [] })).toBe(false);
  });
});
