import path from 'node:path';
import { serve } from '@hono/node-server';
import { APP_NAME } from '@app/shared';
import { createApp } from './app';
import { db } from './db/client';
import { env, REPO_ROOT } from './env';
import { startScheduler } from './scheduler';
import { pruneOrphanAttachmentFiles } from './services/attachments';

// In production the built frontend lives at <repo>/web/dist.
const staticDir =
  process.env.NODE_ENV === 'production'
    ? path.join(REPO_ROOT, 'web/dist')
    : undefined;

const uploadsDir = path.join(REPO_ROOT, 'data/uploads');
// A deleted task cascades its rows away but the bytes stay for undo; clear any
// files that no longer have a row before serving requests.
pruneOrphanAttachmentFiles(db, uploadsDir);

// FR-19/FR-20: scheduled reviews plus a catch-up sweep for missed slots.
const scheduler = startScheduler(db);
const app = createApp(db, { staticDir, uploadsDir, onReviewScheduleChange: scheduler.reschedule });

// NFR-3: bind to loopback only — never 0.0.0.0.
serve({ fetch: app.fetch, hostname: '127.0.0.1', port: env.port }, (info) => {
  const url = `http://127.0.0.1:${info.port}`;
  console.log(`${APP_NAME} listening on ${url}${staticDir ? '' : ' (API only)'}`);
});
