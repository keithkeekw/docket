import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { listStatuses } from '../services/statuses';

export function registerStatusRoutes(app: Hono, db: Db): void {
  // Read-only in M1-S5; the settings screen (M1-S8) adds writes.
  app.get('/api/statuses', (c) => c.json({ statuses: listStatuses(db) }));
}
