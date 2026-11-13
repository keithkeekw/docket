import type { Dashboard } from '@app/shared';
import { desc } from 'drizzle-orm';
import { reviews } from '../db/schema';
import type { Db } from '../db/types';
import { localDateString } from '../lib/dates';
import { getNavSummary } from './nav';
import { listProjects } from './projects';
import { listTasks } from './tasks';

/** Enough to orient without turning the dashboard into another All tasks. */
const GROUP_LIMIT = 6;
const PROJECT_LIMIT = 6;

/**
 * `GET /api/dashboard` (TECHSTACK §5, DESIGN §5.1). The three groups partition
 * open work — overdue, due today, and the Inbox work that is not due yet — so
 * nothing appears twice. Counts are exact even when a group is truncated.
 */
export function getDashboard(db: Db, now: Date = new Date()): Dashboard {
  const today = localDateString(now);

  const overdue = listTasks(db, { dueBefore: today, openOnly: true, order: 'due' });
  const dueToday = listTasks(db, { dueFrom: today, dueTo: today, openOnly: true, order: 'due' });

  // Inbox work with no date, or a date still ahead: the "unsorted" pile.
  const inbox = listTasks(db, { project: 'none', openOnly: true, order: 'due' }).filter(
    (task) => task.dueDate === null || task.dueDate > today,
  );

  const latestReview = db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(1).get();

  return {
    date: today,
    counts: {
      overdue: overdue.length,
      today: dueToday.length,
      inbox: getNavSummary(db, now).counts.inbox,
    },
    groups: {
      overdue: overdue.slice(0, GROUP_LIMIT),
      today: dueToday.slice(0, GROUP_LIMIT),
      inbox: inbox.slice(0, GROUP_LIMIT),
    },
    activeProjects: listProjects(db).slice(0, PROJECT_LIMIT),
    latestReview: latestReview ?? null,
  };
}
