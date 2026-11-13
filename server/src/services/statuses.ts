import type { Status } from '@app/shared';
import { asc, eq } from 'drizzle-orm';
import { statuses } from '../db/schema';
import type { Db } from '../db/types';

/** Global status set in configured order (FR-14, US-10). */
export function listStatuses(db: Db): Status[] {
  return db
    .select({
      id: statuses.id,
      name: statuses.name,
      category: statuses.category,
      position: statuses.position,
    })
    .from(statuses)
    .orderBy(asc(statuses.position), asc(statuses.name))
    .all();
}

export function statusExists(db: Db, id: string): boolean {
  return Boolean(db.select({ id: statuses.id }).from(statuses).where(eq(statuses.id, id)).get());
}

/**
 * Default for a new task and for unticking one (PROGRESS D6): "To do" when it
 * exists, otherwise the first `open` status. Backlog sorts first but is not the
 * default — captured work is something you intend to do.
 */
export function defaultOpenStatusId(db: Db): string | null {
  const named = db
    .select({ id: statuses.id })
    .from(statuses)
    .where(eq(statuses.name, 'To do'))
    .get();
  if (named) return named.id;

  const firstOpen = db
    .select({ id: statuses.id })
    .from(statuses)
    .where(eq(statuses.category, 'open'))
    .orderBy(asc(statuses.position))
    .get();

  return firstOpen?.id ?? null;
}

/** Completion target: the first `done` status, which seeds as "Done". */
export function firstDoneStatusId(db: Db): string | null {
  const row = db
    .select({ id: statuses.id })
    .from(statuses)
    .where(eq(statuses.category, 'done'))
    .orderBy(asc(statuses.position))
    .get();
  return row?.id ?? null;
}
