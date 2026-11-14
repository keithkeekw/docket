import type { ReviewSchedule, UpdateReviewScheduleBody } from '@app/shared';
import { appSettings } from '../db/schema';
import type { Db } from '../db/types';

const DEFAULTS = {
  review_schedule_enabled: '1',
  review_frequency: 'daily',
  daily_review_time: '07:30',
  weekly_review_day: '1',
  weekly_review_time: '07:30',
} as const;

export type ScheduleSettings = ReviewSchedule & {
  lastDailyAt: string | null;
  lastWeeklyAt: string | null;
};

export function readAppSettings(db: Db): Record<string, string> {
  const rows = db.select().from(appSettings).all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function setAppSetting(db: Db, key: string, value: string): void {
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

/** PRD §9 defaults: on, daily at 07:30; weekly is Monday 07:30 (day is ISO 1–7). */
export function readSchedule(db: Db): ScheduleSettings {
  const stored = readAppSettings(db);

  return {
    enabled: (stored.review_schedule_enabled ?? DEFAULTS.review_schedule_enabled) !== '0',
    frequency: stored.review_frequency === 'weekly' ? 'weekly' : DEFAULTS.review_frequency,
    dailyTime: stored.daily_review_time ?? DEFAULTS.daily_review_time,
    weeklyDay: Number(stored.weekly_review_day ?? DEFAULTS.weekly_review_day),
    weeklyTime: stored.weekly_review_time ?? DEFAULTS.weekly_review_time,
    lastDailyAt: stored.last_daily_review_at ?? null,
    lastWeeklyAt: stored.last_weekly_review_at ?? null,
  };
}

export function readReviewSchedule(db: Db): ReviewSchedule {
  const { enabled, frequency, weeklyDay, dailyTime, weeklyTime } = readSchedule(db);
  return { enabled, frequency, weeklyDay, dailyTime, weeklyTime };
}

export function updateReviewSchedule(db: Db, body: UpdateReviewScheduleBody): ReviewSchedule {
  const updates: Array<[string, string]> = [];
  if (body.enabled !== undefined)
    updates.push(['review_schedule_enabled', body.enabled ? '1' : '0']);
  if (body.frequency !== undefined) updates.push(['review_frequency', body.frequency]);
  if (body.weeklyDay !== undefined) updates.push(['weekly_review_day', String(body.weeklyDay)]);
  if (body.dailyTime !== undefined) updates.push(['daily_review_time', body.dailyTime]);
  if (body.weeklyTime !== undefined) updates.push(['weekly_review_time', body.weeklyTime]);

  // better-sqlite3 is synchronous, so writes through `db` stay inside this transaction.
  db.transaction(() => {
    for (const [key, value] of updates) setAppSetting(db, key, value);
  });

  return readReviewSchedule(db);
}
