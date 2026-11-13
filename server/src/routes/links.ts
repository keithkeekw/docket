import { createTaskLinkBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { addLink, deleteLink } from '../services/links';

export function registerLinkRoutes(app: Hono, db: Db): void {
  app.post('/api/tasks/:id/links', async (c) => {
    const parsed = createTaskLinkBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ link: addLink(db, c.req.param('id'), parsed.data) }, 201);
  });

  app.delete('/api/links/:id', (c) => {
    deleteLink(db, c.req.param('id'));
    return c.body(null, 204);
  });
}
