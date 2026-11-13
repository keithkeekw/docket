import { serve } from '@hono/node-server';
import { APP_NAME } from '@app/shared';
import { createApp } from './app';
import { db } from './db/client';
import { env } from './env';
import { startScheduler } from './scheduler';

const app = createApp(db);
// FR-19/FR-20: scheduled reviews plus a catch-up sweep for missed slots.
startScheduler(db);

// NFR-3: bind to loopback only — never 0.0.0.0.
serve({ fetch: app.fetch, hostname: '127.0.0.1', port: env.port }, (info) => {
  console.log(`${APP_NAME} API listening on http://127.0.0.1:${info.port}`);
});
