import fs from 'node:fs';
import path from 'node:path';
import type { BackupEntry } from '@app/shared';
import type { Db } from '../db/types';
import { env } from '../env';
import { ServiceError } from '../lib/errors';

/** `data/backups` next to the database file, unless a caller overrides it. */
export function defaultBackupsDir(): string {
  return path.join(path.dirname(env.databasePath), 'backups');
}

/**
 * Tables in dependency order. Restore deletes children first and inserts
 * parents first; foreign keys are deferred so either order would work, but this
 * keeps the intent readable.
 */
const TABLES = [
  'statuses',
  'projects',
  'tags',
  'milestones',
  'tasks',
  'checklist_items',
  'task_links',
  'task_tags',
  'reviews',
  'ai_settings',
  'app_settings',
  'proposals',
] as const;

/** Filenames we create, and nothing else, may be restored or downloaded. */
const BACKUP_FILE = /^[a-z0-9][a-z0-9._-]*\.db$/i;

function entryFor(dir: string, file: string): BackupEntry {
  const stats = fs.statSync(path.join(dir, file));

  return {
    file,
    sizeBytes: stats.size,
    createdAt: stats.mtime.toISOString(),
  };
}

function resolveBackup(dir: string, file: string): string {
  const name = path.basename(file);

  if (name !== file || !BACKUP_FILE.test(name)) {
    throw new ServiceError('Invalid backup file name', 400);
  }

  const target = path.join(dir, name);
  if (!fs.existsSync(target)) throw new ServiceError('Backup not found', 404);

  return target;
}

/** Newest first, so the list reads like a history. */
export function listBackups(dir: string = defaultBackupsDir()): BackupEntry[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => BACKUP_FILE.test(file))
    .map((file) => entryFor(dir, file))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Copies the live database with SQLite's online backup API, so WAL writes in
 * flight cannot produce a torn file. `label` distinguishes the snapshot taken
 * automatically before a restore.
 */
export async function createBackup(
  db: Db,
  dir: string = defaultBackupsDir(),
  label: 'app' | 'pre-restore' = 'app',
): Promise<BackupEntry> {
  fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `${label}-${stamp}.db`;

  await db.$client.backup(path.join(dir, file));

  return entryFor(dir, file);
}

export function readBackup(
  dir: string,
  file: string,
): { data: Buffer; entry: BackupEntry } {
  const target = resolveBackup(dir, file);
  return { data: fs.readFileSync(target), entry: entryFor(dir, path.basename(target)) };
}

/**
 * Replaces every row with the backup's contents. Restoring by copying the file
 * under the open connection would need a restart, so the backup is attached and
 * its tables copied inside one transaction instead (PROGRESS D45) — either the
 * whole restore lands or nothing does (NFR-6).
 *
 * A pre-restore snapshot is taken first, so a wrong choice is recoverable.
 */
export async function restoreBackup(
  db: Db,
  file: string,
  dir: string = defaultBackupsDir(),
): Promise<{ restored: string; safetyBackup: BackupEntry }> {
  const target = resolveBackup(dir, file);
  const safetyBackup = await createBackup(db, dir, 'pre-restore');

  const raw = db.$client;
  const quoted = target.replace(/'/g, "''");

  raw.exec(`ATTACH DATABASE '${quoted}' AS restored`);

  try {
    raw.exec('PRAGMA defer_foreign_keys = ON');
    raw.exec('BEGIN IMMEDIATE');

    for (const table of [...TABLES].reverse()) raw.exec(`DELETE FROM main.${table}`);
    for (const table of TABLES) raw.exec(`INSERT INTO main.${table} SELECT * FROM restored.${table}`);

    raw.exec('COMMIT');
  } catch (cause) {
    raw.exec('ROLLBACK');
    const detail = cause instanceof Error ? cause.message : 'unknown error';
    throw new ServiceError(`Restore failed: ${detail}`, 400);
  } finally {
    raw.exec('DETACH DATABASE restored');
  }

  return { restored: path.basename(target), safetyBackup };
}
