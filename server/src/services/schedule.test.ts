import { describe, expect, it } from 'vitest';
import { dueReviews, isoDayOfWeek, lastWeeklySlot } from './schedule';
import type { ScheduleSettings } from './settings';

const SETTINGS: ScheduleSettings = {
  enabled: true,
  frequency: 'daily',
  dailyTime: '07:30',
  weeklyDay: 1,
  weeklyTime: '07:30',
  lastDailyAt: null,
  lastWeeklyAt: null,
};

describe('isoDayOfWeek', () => {
  it('maps Monday to 1 and Sunday to 7', () => {
    expect(isoDayOfWeek(new Date(2026, 10, 9))).toBe(1); // Monday
    expect(isoDayOfWeek(new Date(2026, 10, 13))).toBe(5); // Friday
    expect(isoDayOfWeek(new Date(2026, 10, 15))).toBe(7); // Sunday
  });
});

describe('lastWeeklySlot', () => {
  it('returns the most recent Monday before a Friday', () => {
    const slot = lastWeeklySlot(new Date(2026, 10, 13, 9, 0), 1, '07:30');
    expect(slot).toEqual(new Date(2026, 10, 9, 7, 30));
  });

  it('stays on today when the slot has already passed', () => {
    const slot = lastWeeklySlot(new Date(2026, 10, 9, 8, 0), 1, '07:30');
    expect(slot).toEqual(new Date(2026, 10, 9, 7, 30));
  });

  it('moves back a week when today is the day but the time has not come', () => {
    const slot = lastWeeklySlot(new Date(2026, 10, 9, 6, 0), 1, '07:30');
    expect(slot).toEqual(new Date(2026, 10, 2, 7, 30));
  });

  it('handles a Sunday schedule (ISO 7)', () => {
    const slot = lastWeeklySlot(new Date(2026, 10, 13, 9, 0), 7, '07:30');
    expect(slot).toEqual(new Date(2026, 10, 8, 7, 30)); // previous Sunday
  });
});

describe('dueReviews', () => {
  it('finds nothing before the daily time', () => {
    const due = dueReviews(
      {
        ...SETTINGS,
        weeklyDay: 5,
        lastWeeklyAt: new Date(2026, 10, 12, 8, 0).toISOString(),
      },
      new Date(2026, 10, 13, 6, 0),
    );

    expect(due).toEqual([]);
  });

  it('catches up only the daily review when the frequency is daily', () => {
    expect(dueReviews({ ...SETTINGS, weeklyDay: 5 }, new Date(2026, 10, 13, 9, 0))).toEqual([
      'daily',
    ]);
  });

  it('catches up only the weekly review when the frequency is weekly', () => {
    expect(
      dueReviews({ ...SETTINGS, frequency: 'weekly', weeklyDay: 5 }, new Date(2026, 10, 13, 9, 0)),
    ).toEqual(['weekly']);
  });

  it('finds nothing when scheduled reviews are turned off', () => {
    expect(dueReviews({ ...SETTINGS, enabled: false }, new Date(2026, 10, 13, 9, 0))).toEqual([]);
    expect(
      dueReviews(
        { ...SETTINGS, enabled: false, frequency: 'weekly' },
        new Date(2026, 10, 13, 9, 0),
      ),
    ).toEqual([]);
  });

  it('is quiet once the daily slot has a watermark after it', () => {
    const due = dueReviews(
      { ...SETTINGS, lastDailyAt: new Date(2026, 10, 13, 7, 30).toISOString() },
      new Date(2026, 10, 13, 9, 0),
    );

    expect(due).toEqual([]);
  });

  it('catches up a missed weekly review on another day', () => {
    const due = dueReviews(
      {
        ...SETTINGS,
        frequency: 'weekly',
        lastDailyAt: new Date(2026, 10, 13, 7, 30).toISOString(),
      },
      new Date(2026, 10, 13, 9, 0),
    );

    expect(due).toEqual(['weekly']);
  });

  it('is quiet once the weekly slot has a watermark after it', () => {
    const due = dueReviews(
      {
        ...SETTINGS,
        frequency: 'weekly',
        weeklyDay: 5,
        lastWeeklyAt: new Date(2026, 10, 13, 7, 30).toISOString(),
      },
      new Date(2026, 10, 13, 9, 0),
    );

    expect(due).toEqual([]);
  });

  it('does not rerun a daily review stamped yesterday', () => {
    const due = dueReviews(
      {
        ...SETTINGS,
        weeklyDay: 5,
        lastDailyAt: new Date(2026, 10, 12, 7, 30).toISOString(),
        lastWeeklyAt: new Date(2026, 10, 13, 7, 30).toISOString(),
      },
      new Date(2026, 10, 13, 9, 0),
    );

    expect(due).toEqual(['daily']);
  });
});
