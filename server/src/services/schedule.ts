import type { ScheduleSettings } from './settings';

type ReviewKind = 'daily' | 'weekly';

function atTime(now: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const slot = new Date(now);
  slot.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return slot;
}

/** ISO weekday: Monday 1 … Sunday 7 (PRD §9 keeps the week starting Monday). */
export function isoDayOfWeek(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

/** The most recent weekly slot at or before `now`. */
export function lastWeeklySlot(now: Date, isoDay: number, time: string): Date {
  const slot = atTime(now, time);
  let back = (isoDayOfWeek(now) - isoDay + 7) % 7;

  if (back === 0 && slot > now) back = 7;
  slot.setDate(slot.getDate() - back);

  return slot;
}

/**
 * FR-20 catch-up, and the same rule the cron jobs express: a slot is missed when
 * it has passed and nothing has been generated since. `null` means "never", so a
 * first start after the scheduled time catches up once.
 */
export function dueReviews(settings: ScheduleSettings, now: Date): ReviewKind[] {
  if (!settings.enabled) return [];

  if (settings.frequency === 'daily') {
    const dailySlot = atTime(now, settings.dailyTime);
    const lastDaily = settings.lastDailyAt ? new Date(settings.lastDailyAt) : null;
    return now >= dailySlot && (!lastDaily || lastDaily < dailySlot) ? ['daily'] : [];
  }

  const weeklySlot = lastWeeklySlot(now, settings.weeklyDay, settings.weeklyTime);
  const lastWeekly = settings.lastWeeklyAt ? new Date(settings.lastWeeklyAt) : null;
  return now >= weeklySlot && (!lastWeekly || lastWeekly < weeklySlot) ? ['weekly'] : [];
}
