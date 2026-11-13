import { APP_NAME } from '@app/shared';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { statuses } from './db/schema';
import type { Db } from './db/types';
import { getNavSummary } from './services/nav';

/**
 * The Hono app is created separately from the HTTP listener so tests can call
 * `app.request(...)` against an in-memory database (PROGRESS D13).
 */
export function createApp(db: Db): Hono {
  const app = new Hono();

  // NFR-3: the API is local-only. CORS additionally restricts callers to the dev
  // server on this machine.
  app.use(
    '/api/*',
    cors({
      origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  function databaseHealth(): { ready: boolean; statuses?: number; error?: string } {
    try {
      const row = db.select({ count: sql<number>`count(*)` }).from(statuses).get();
      return { ready: true, statuses: Number(row?.count ?? 0) };
    } catch (error) {
      return {
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      app: APP_NAME,
      database: databaseHealth(),
      time: new Date().toISOString(),
    }),
  );

  // App shell: sidebar counts and the active project list.
  app.get('/api/nav', (c) => c.json(getNavSummary(db)));

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  return app;
}
