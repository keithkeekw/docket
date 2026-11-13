import { APP_NAME } from '@app/shared';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { statuses } from './db/schema';
import type { Db } from './db/types';
import { ServiceError } from './lib/errors';
import { registerAiRoutes } from './routes/ai';
import { registerAiSettingsRoutes } from './routes/ai-settings';
import { registerBackupRoutes } from './routes/backups';
import { registerChecklistRoutes } from './routes/checklist';
import { registerExportRoutes } from './routes/export';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerLinkRoutes } from './routes/links';
import { registerMilestoneRoutes } from './routes/milestones';
import { registerProjectRoutes } from './routes/projects';
import { registerProposalRoutes } from './routes/proposals';
import { registerReviewRoutes } from './routes/reviews';
import { registerStatusRoutes } from './routes/statuses';
import { registerTagRoutes } from './routes/tags';
import { registerUndoRoutes } from './routes/undo';
import { registerTaskRoutes } from './routes/tasks';
import { getNavSummary } from './services/nav';

/**
 * The Hono app is created separately from the HTTP listener so tests can call
 * `app.request(...)` against an in-memory database (PROGRESS D13).
 */
export function createApp(db: Db, options: { backupsDir?: string } = {}): Hono {
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
      const row = db
        .select({ count: sql<number>`count(*)` })
        .from(statuses)
        .get();
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

  registerTaskRoutes(app, db);
  registerDashboardRoutes(app, db);
  registerStatusRoutes(app, db);
  registerProjectRoutes(app, db);
  registerMilestoneRoutes(app, db);
  registerChecklistRoutes(app, db);
  registerLinkRoutes(app, db);
  registerTagRoutes(app, db);
  registerAiSettingsRoutes(app, db);
  registerAiRoutes(app, db);
  registerProposalRoutes(app, db);
  registerReviewRoutes(app, db);
  registerExportRoutes(app, db);
  registerUndoRoutes(app, db);
  registerBackupRoutes(app, db, options.backupsDir);

  // Services throw ServiceError with the intended status; anything else is a bug
  // and is logged rather than leaked to the client.
  app.onError((error, c) => {
    if (error instanceof ServiceError) {
      return c.json({ error: error.message }, error.status as 400 | 404 | 409 | 500);
    }

    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  return app;
}
