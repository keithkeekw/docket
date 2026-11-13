import type Database from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from './schema';

/**
 * Database handle typed with the full schema, safe to pass to services.
 *
 * `drizzle()` returns the driver instance plus `$client`, the raw
 * better-sqlite3 handle. The backup service needs it for SQLite's online backup
 * and ATTACH-based restore (PROGRESS D45), so the alias keeps it.
 */
export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };
