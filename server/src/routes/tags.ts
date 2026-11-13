import { setTaskTagsBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { listTags, setTaskTags } from '../services/tags';

export function registerTagRoutes(app: Hono, db: Db): void {
  app.get('/api/tags', (c) => c.json({ tags: listTags(db) }));

  // Replaces the whole set, which is what a tag editor does (FR-30).
  app.put('/api/tasks/:id/tags', async (c) => {
    const parsed = setTaskTagsBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ tags: setTaskTags(db, c.req.param('id'), parsed.data.tags) });
  });
}
