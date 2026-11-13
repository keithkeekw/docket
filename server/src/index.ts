import { serve } from '@hono/node-server';
import { APP_NAME } from '@app/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';

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

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    app: APP_NAME,
    time: new Date().toISOString(),
  }),
);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

// NFR-3: bind to loopback only — never 0.0.0.0.
serve({ fetch: app.fetch, hostname: '127.0.0.1', port: env.port }, (info) => {
  console.log(`${APP_NAME} API listening on http://127.0.0.1:${info.port}`);
});
