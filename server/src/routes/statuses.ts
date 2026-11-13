import { createStatusBodySchema, updateStatusBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { createStatus, deleteStatus, listStatuses, updateStatus } from '../services/statuses';

export function registerStatusRoutes(app: Hono, db: Db): void {
  app.get('/api/statuses', (c) => c.json({ statuses: listStatuses(db) }));

  app.post('/api/statuses', async (c) => {
    const parsed = createStatusBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ status: createStatus(db, parsed.data) }, 201);
  });

  app.patch('/api/statuses/:id', async (c) => {
    const parsed = updateStatusBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ status: updateStatus(db, c.req.param('id'), parsed.data) });
  });

  app.delete('/api/statuses/:id', (c) => {
    deleteStatus(db, c.req.param('id'));
    return c.body(null, 204);
  });
}
