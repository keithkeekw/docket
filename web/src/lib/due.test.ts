import { describe, expect, it } from 'vitest';
import { describeDue } from './due';

const now = new Date(2026, 10, 13, 9, 0); // Fri 13 Nov 2026, 09:00 local

describe('describeDue', () => {
  it('marks a past date as overdue', () => {
    expect(describeDue('2026-11-12', null, now)).toEqual({
      label: 'Thu 12 Nov',
      absolute: 'Thu 12 Nov',
      overdue: true,
    });
  });

  it('does not mark a date-only task due today as overdue', () => {
    expect(describeDue('2026-11-13', null, now)).toEqual({
      label: 'Today',
      absolute: 'Fri 13 Nov',
      overdue: false,
    });
  });

  it('shows the time for a task due today with a time', () => {
    expect(describeDue('2026-11-13', '10:00', now)).toEqual({
      label: '10:00',
      absolute: 'Fri 13 Nov, 10:00',
      overdue: false,
    });
  });

  it('marks a time that has passed today as overdue', () => {
    const due = describeDue('2026-11-13', '08:30', now);
    expect(due.label).toBe('08:30');
    expect(due.overdue).toBe(true);
  });

  it('formats a future date', () => {
    expect(describeDue('2026-11-16', null, now)).toEqual({
      label: 'Mon 16 Nov',
      absolute: 'Mon 16 Nov',
      overdue: false,
    });
  });

  it('falls back to the raw value when the date is invalid', () => {
    expect(describeDue('not-a-date', null, now)).toEqual({
      label: 'not-a-date',
      absolute: 'not-a-date',
      overdue: false,
    });
  });

  it('ignores a malformed time', () => {
    const due = describeDue('2026-11-13', '99:99', now);
    expect(due.label).toBe('Today');
    expect(due.overdue).toBe(false);
  });
});
