import { describe, expect, it } from 'vitest';
import { nextOccurrence } from './recurrence';

describe('nextOccurrence', () => {
  it('advances a daily task by one day', () => {
    expect(nextOccurrence('FREQ=DAILY', '2026-11-13', null)).toEqual({
      dueDate: '2026-11-14',
      dueTime: null,
    });
  });

  it('advances a weekly task by seven days', () => {
    expect(nextOccurrence('FREQ=WEEKLY', '2026-11-13', null)?.dueDate).toBe('2026-11-20');
  });

  it('honours an interval of two weeks', () => {
    expect(nextOccurrence('FREQ=WEEKLY;INTERVAL=2', '2026-11-13', null)?.dueDate).toBe(
      '2026-11-27',
    );
  });

  it('advances a monthly task to the same day next month', () => {
    expect(nextOccurrence('FREQ=MONTHLY', '2026-01-15', null)?.dueDate).toBe('2026-02-15');
  });

  it('keeps the due time', () => {
    expect(nextOccurrence('FREQ=DAILY', '2026-11-13', '09:30')).toEqual({
      dueDate: '2026-11-14',
      dueTime: '09:30',
    });
  });

  it('crosses a month and a year boundary', () => {
    expect(nextOccurrence('FREQ=DAILY', '2026-12-31', null)?.dueDate).toBe('2027-01-01');
  });

  it('returns null when the rule has no next date', () => {
    expect(nextOccurrence('FREQ=DAILY;COUNT=1', '2026-11-13', null)).toBeNull();
  });

  it('returns null for an unparseable rule instead of throwing', () => {
    expect(nextOccurrence('every other tuesday', '2026-11-13', null)).toBeNull();
    expect(nextOccurrence('', '2026-11-13', null)).toBeNull();
  });

  it('returns null for a malformed date', () => {
    expect(nextOccurrence('FREQ=DAILY', 'not-a-date', null)).toBeNull();
  });
});
