import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../env';
import * as schema from './schema';

fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });

export const sqlite = new Database(env.databasePath);

// WAL keeps reads fast while a write is in flight (NFR-4); foreign keys enforce
// the relations declared in schema.ts (NFR-6).
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });
