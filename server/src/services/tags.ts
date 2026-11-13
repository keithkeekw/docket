import type { Tag } from '@app/shared';
import { asc, eq } from 'drizzle-orm';
import { tags, taskTags, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';

export function listTags(db: Db): Tag[] {
  return db.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name)).all();
}

/** FR-30: tags are created on the fly. */
export function ensureTag(db: Db, name: string): string {
  const existing = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
  if (existing) return existing.id;

  return db.insert(tags).values({ name }).returning({ id: tags.id }).get().id;
}

/**
 * Case-insensitive de-duplication so "Vendor" and "vendor" do not become two
 * tags; the first spelling wins.
 */
export function normaliseTagNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(name);
  }

  return result;
}

/** Replaces a task's tag set. Returns the names in the order given. */
export function setTaskTags(db: Db, taskId: string, names: string[]): string[] {
  const task = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) throw new ServiceError('Task not found', 404);

  const cleaned = normaliseTagNames(names);

  db.delete(taskTags).where(eq(taskTags.taskId, taskId)).run();

  for (const name of cleaned) {
    db.insert(taskTags).values({ taskId, tagId: ensureTag(db, name) }).run();
  }

  return cleaned;
}
