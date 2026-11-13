import path from 'node:path';
import { serve } from '@hono/node-server';
import { APP_NAME } from '@app/shared';
import { createApp } from './app';
import { db } from './db/client';
import { env, REPO_ROOT } from './env';
import { startScheduler } from './scheduler';

// In production the built frontend lives at <repo>/web/dist.
const staticDir =
  process.env.NODE_ENV === 'production'
    ? path.join(REPO_ROOT, 'web/dist')
    : undefined;

const app = createApp(db, { staticDir });
// FR-19/FR-20: scheduled reviews plus a catch-up sweep for missed slots.
startScheduler(db);

// NFR-3: bind to loopback only — never 0.0.0.0.
serve({ fetch: app.fetch, hostname: '127.0.0.1', port: env.port }, (info) => {
  const url = `http://127.0.0.1:${info.port}`;
  console.log(`${APP_NAME} listening on ${url}${staticDir ? '' : ' (API only)'}`);
});
