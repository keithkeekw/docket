import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../db/schema';
import { seedAppSettings, seedStatuses } from '../db/seed-data';
import type { Db } from '../db/types';

const migrationsFolder = fileURLToPath(new URL('../db/migrations', import.meta.url));

/**
 * In-memory database with every migration applied and the default seed loaded.
 * Each call returns an isolated database, so tests never touch `data/app.db`.
 */
export function createTestDb(): { sqlite: Database.Database; db: Db } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  seedStatuses(db);
  seedAppSettings(db);

  return { sqlite, db };
}
