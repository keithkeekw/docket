import type { CreateStatusBody, Status, UpdateStatusBody } from '@app/shared';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';

const statusSelection = {
  id: statuses.id,
  name: statuses.name,
  category: statuses.category,
  position: statuses.position,
};

type StatusRow = {
  id: string;
  name: string;
  category: 'open' | 'active' | 'done';
  position: number;
};

function taskCounts(db: Db): Map<string, number> {
  const rows = db
    .select({ statusId: tasks.statusId, total: sql<number>`count(*)` })
    .from(tasks)
    .groupBy(tasks.statusId)
    .all();

  return new Map(rows.map((row) => [row.statusId, Number(row.total)]));
}

function toStatus(row: StatusRow, count: number | undefined): Status {
  return { ...row, taskCount: count ?? 0 };
}

/** Global status set in configured order (FR-14, US-10). */
export function listStatuses(db: Db): Status[] {
  const counts = taskCounts(db);

  return db
    .select(statusSelection)
    .from(statuses)
    .orderBy(asc(statuses.position), asc(statuses.name))
    .all()
    .map((row) => toStatus(row, counts.get(row.id)));
}

function requireStatus(db: Db, id: string): StatusRow {
  const row: StatusRow | undefined = db
    .select(statusSelection)
    .from(statuses)
    .where(eq(statuses.id, id))
    .get();

  if (!row) throw new ServiceError('Status not found', 404);
  return row;
}

export function getStatus(db: Db, id: string): Status {
  const row = requireStatus(db, id);
  return toStatus(row, taskCounts(db).get(id));
}

/** Status names are unique (D19); the comparison ignores case. */
function assertNameFree(db: Db, name: string, ignoreId?: string): void {
  const clash = db
    .select({ id: statuses.id })
    .from(statuses)
    .where(sql`lower(${statuses.name}) = lower(${name})`)
    .get();

  if (clash && clash.id !== ignoreId) {
    throw new ServiceError('A status with that name already exists', 400);
  }
}

export function statusExists(db: Db, id: string): boolean {
  return Boolean(db.select({ id: statuses.id }).from(statuses).where(eq(statuses.id, id)).get());
}

/** `done` is what makes `completed_at` meaningful (FR-4, FR-9). */
export function statusCategoryOf(db: Db, id: string): 'open' | 'active' | 'done' | null {
  const row = db
    .select({ category: statuses.category })
    .from(statuses)
    .where(eq(statuses.id, id))
    .get();

  return row?.category ?? null;
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

export function createStatus(db: Db, body: CreateStatusBody): Status {
  assertNameFree(db, body.name);

  const positionRow = db
    .select({ value: sql<number>`coalesce(max(${statuses.position}), -1) + 1` })
    .from(statuses)
    .get();

  const inserted = db
    .insert(statuses)
    .values({
      name: body.name,
      category: body.category,
      position: body.position ?? Number(positionRow?.value ?? 0),
    })
    .returning({ id: statuses.id })
    .get();

  return getStatus(db, inserted.id);
}

/**
 * Renaming or recategorising a status can change what "done" means for every
 * task in it, so `completed_at` follows the category here too (D34).
 */
export function updateStatus(db: Db, id: string, body: UpdateStatusBody): Status {
  const existing = requireStatus(db, id);

  if (body.name !== undefined) assertNameFree(db, body.name, id);

  const patch: Partial<typeof statuses.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.category !== undefined) patch.category = body.category;
  if (body.position !== undefined) patch.position = body.position;

  if (Object.keys(patch).length > 0) {
    db.update(statuses).set(patch).where(eq(statuses.id, id)).run();
  }

  if (body.category !== undefined && body.category !== existing.category) {
    const now = new Date().toISOString();

    if (body.category === 'done') {
      db.update(tasks)
        .set({ completedAt: now, updatedAt: now })
        .where(and(eq(tasks.statusId, id), isNull(tasks.completedAt)))
        .run();
    } else {
      db.update(tasks).set({ completedAt: null, updatedAt: now }).where(eq(tasks.statusId, id)).run();
    }
  }

  return getStatus(db, id);
}

/** US-10: a status in use cannot be removed until its tasks move elsewhere. */
export function deleteStatus(db: Db, id: string): void {
  requireStatus(db, id);

  const count = taskCounts(db).get(id) ?? 0;
  if (count > 0) {
    throw new ServiceError(
      `A status in use cannot be removed until its ${count} ${count === 1 ? 'task moves' : 'tasks move'} to another status`,
      409,
    );
  }

  const total = db.select({ value: sql<number>`count(*)` }).from(statuses).get();
  if (Number(total?.value ?? 0) <= 1) {
    throw new ServiceError('At least one status is required', 400);
  }

  db.delete(statuses).where(eq(statuses.id, id)).run();
}
