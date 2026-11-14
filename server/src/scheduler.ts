import cron from 'node-cron';
import { featureConfig } from './ai/client';
import type { Db } from './db/types';
import { dueReviews } from './services/schedule';
import { generateReview } from './services/reviews';
import { readSchedule } from './services/settings';

const FEATURE = { daily: 'review_daily', weekly: 'review_weekly' } as const;

type ReviewKind = keyof typeof FEATURE;

export type Scheduler = {
  /** Re-read Settings → Reviews and replace the cron job. No catch-up runs. */
  reschedule: () => void;
  stop: () => void;
};

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

function cronExpression(time: string, cronDay: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return `${minutes ?? 0} ${hours ?? 7} * * ${cronDay}`;
}

/**
 * One node-cron job for the frequency chosen in Settings → Reviews, plus the
 * catch-up sweep at start. Turning reviews off leaves no job at all.
 */
export function startScheduler(db: Db, now: Date = new Date()): Scheduler {
  let job: ReturnType<typeof cron.schedule> | null = null;

  function reschedule(): void {
    job?.stop();
    job = null;

    const settings = readSchedule(db);
    if (!settings.enabled) return;

    if (settings.frequency === 'daily') {
      job = cron.schedule(cronExpression(settings.dailyTime, '*'), () => {
        void run(db, 'daily', 'schedule');
      });
    } else {
      const cronDay = settings.weeklyDay === 7 ? 0 : settings.weeklyDay;
      job = cron.schedule(cronExpression(settings.weeklyTime, String(cronDay)), () => {
        void run(db, 'weekly', 'schedule');
      });
    }
  }

  reschedule();

  for (const kind of dueReviews(readSchedule(db), now)) {
    void run(db, kind, 'catch-up');
  }

  return {
    reschedule,
    stop: () => {
      job?.stop();
      job = null;
    },
  };
}
