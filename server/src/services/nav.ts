import { asc, eq, sql } from 'drizzle-orm';
import type { NavSummary } from '@app/shared';
import { projects, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { localDateString } from '../lib/dates';

/**
 * Data for the app shell (`GET /api/nav`).
 *
 * Counts cover open work only — a task counts as open while its status
 * category is not `done` (PROGRESS D6). "Today" is overdue plus due today
 * (PROGRESS D8), so it is every open task whose due date is on or before the
 * local calendar day.
 */
export function getNavSummary(db: Db, now: Date = new Date()): NavSummary {
  const today = localDateString(now);

  const counts = db
    .select({
      all: sql<number>`count(*)`,
      inbox: sql<number>`coalesce(sum(case when ${tasks.projectId} is null then 1 else 0 end), 0)`,
      today: sql<number>`coalesce(sum(case when ${tasks.dueDate} is not null and ${tasks.dueDate} <= ${today} then 1 else 0 end), 0)`,
    })
    .from(tasks)
    .innerJoin(statuses, eq(tasks.statusId, statuses.id))
    .where(sql`${statuses.category} <> 'done'`)
    .get();

  const projectRows = db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.archived, false))
    .orderBy(asc(projects.position), asc(projects.name))
    .all();

  return {
    counts: {
      inbox: Number(counts?.inbox ?? 0),
      today: Number(counts?.today ?? 0),
      all: Number(counts?.all ?? 0),
    },
    projects: projectRows,
  };
}
