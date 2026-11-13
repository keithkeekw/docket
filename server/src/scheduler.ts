import cron from 'node-cron';
import { featureConfig } from './ai/client';
import type { Db } from './db/types';
import { dueReviews } from './services/schedule';
import { generateReview } from './services/reviews';
import { readSchedule } from './services/settings';

const FEATURE = { daily: 'review_daily', weekly: 'review_weekly' } as const;

type ReviewKind = keyof typeof FEATURE;

/** Reviews only run while the server runs (TECHSTACK §7). */
async function run(db: Db, kind: ReviewKind, source: 'schedule' | 'catch-up'): Promise<void> {
  if (!featureConfig(db, FEATURE[kind])) return;

  try {
    await generateReview(db, kind);
    console.log(`Review: ${kind} generated (${source})`);
  } catch (error) {
    // A failed review must never take the server down (NFR-9).
    console.error(
      `Review: ${kind} failed —`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Node-cron jobs for the times in `app_settings`, plus the catch-up sweep at
 * start. Returns a stop function so tests and shutdown can clear the timers.
 */
export function startScheduler(db: Db, now: Date = new Date()): () => void {
  const settings = readSchedule(db);
  const [dailyHours, dailyMinutes] = settings.dailyTime.split(':').map(Number);
  const [weeklyHours, weeklyMinutes] = settings.weeklyTime.split(':').map(Number);
  const weeklyCronDay = settings.weeklyDay === 7 ? 0 : settings.weeklyDay;

  const jobs = [
    cron.schedule(`${dailyMinutes ?? 0} ${dailyHours ?? 7} * * *`, () => {
      void run(db, 'daily', 'schedule');
    }),
    cron.schedule(`${weeklyMinutes ?? 0} ${weeklyHours ?? 7} * * ${weeklyCronDay}`, () => {
      void run(db, 'weekly', 'schedule');
    }),
  ];

  for (const kind of dueReviews(settings, now)) {
    void run(db, kind, 'catch-up');
  }

  return () => {
    for (const job of jobs) job.stop();
  };
}
