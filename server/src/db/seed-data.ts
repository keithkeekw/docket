import { appSettings, statuses } from './schema';
import type { Db } from './types';

/**
 * The one custom status set from TECHSTACK §4. Order matters: it is the Kanban
 * column order (US-8) and the order shown in Settings (US-10).
 */
export const DEFAULT_STATUSES = [
  { name: 'Backlog', category: 'open', position: 0 },
  { name: 'To do', category: 'open', position: 1 },
  { name: 'In progress', category: 'active', position: 2 },
  { name: 'Waiting', category: 'active', position: 3 },
  { name: 'Done', category: 'done', position: 4 },
] as const;

/** PRD §9 assumptions: daily 07:30, weekly Monday 07:30. Day is ISO 1–7. */
export const DEFAULT_APP_SETTINGS = [
  { key: 'daily_review_time', value: '07:30' },
  { key: 'weekly_review_day', value: '1' },
  { key: 'weekly_review_time', value: '07:30' },
] as const;

/**
 * Idempotent: inserts only statuses whose name is missing, so re-running never
 * duplicates the set or overwrites a user's rename.
 */
export function seedStatuses(db: Db): number {
  const existing = new Set(
    db
      .select({ name: statuses.name })
      .from(statuses)
      .all()
      .map((row) => row.name),
  );

  const missing = DEFAULT_STATUSES.filter((status) => !existing.has(status.name));
  if (missing.length === 0) return 0;

  db.insert(statuses)
    .values(missing.map((status) => ({ ...status })))
    .run();

  return missing.length;
}

/** Idempotent: existing keys keep their value. */
export function seedAppSettings(db: Db): number {
  const result = db
    .insert(appSettings)
    .values(DEFAULT_APP_SETTINGS.map((setting) => ({ ...setting })))
    .onConflictDoNothing()
    .run();

  return result.changes;
}
