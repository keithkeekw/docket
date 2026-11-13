import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from './schema';

/** Database handle typed with the full schema, safe to pass to services. */
export type Db = BetterSQLite3Database<typeof schema>;
