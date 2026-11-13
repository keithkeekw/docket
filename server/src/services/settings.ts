import { eq } from 'drizzle-orm';
import { appSettings } from '../db/schema';
import type { Db } from '../db/types';

const DEFAULTS = {
  daily_review_time: '07:30',
  weekly_review_day: '1',
  weekly_review_time: '07:30',
} as const;

export type ScheduleSettings = {
  dailyTime: string;
  weeklyDay: number;
  weeklyTime: string;
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

/** PRD §9 defaults: daily 07:30, weekly Monday 07:30 (day is ISO 1–7). */
export function readSchedule(db: Db): ScheduleSettings {
  const stored = readAppSettings(db);

  return {
    dailyTime: stored.daily_review_time ?? DEFAULTS.daily_review_time,
    weeklyDay: Number(stored.weekly_review_day ?? DEFAULTS.weekly_review_day),
    weeklyTime: stored.weekly_review_time ?? DEFAULTS.weekly_review_time,
    lastDailyAt: stored.last_daily_review_at ?? null,
    lastWeeklyAt: stored.last_weekly_review_at ?? null,
  };
}

export function deleteAppSetting(db: Db, key: string): void {
  db.delete(appSettings).where(eq(appSettings.key, key)).run();
}
