import { createChecklistItemBodySchema, updateChecklistItemBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { addChecklistItem, deleteChecklistItem, updateChecklistItem } from '../services/checklist';

export function registerChecklistRoutes(app: Hono, db: Db): void {
  app.post('/api/tasks/:id/checklist', async (c) => {
    const parsed = createChecklistItemBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ item: addChecklistItem(db, c.req.param('id'), parsed.data) }, 201);
  });

  app.patch('/api/checklist/:id', async (c) => {
    const parsed = updateChecklistItemBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ item: updateChecklistItem(db, c.req.param('id'), parsed.data) });
  });

  app.delete('/api/checklist/:id', (c) => {
    deleteChecklistItem(db, c.req.param('id'));
    return c.body(null, 204);
  });
}
