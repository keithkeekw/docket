import {
  createMilestoneBodySchema,
  reorderMilestonesBodySchema,
  updateMilestoneBodySchema,
} from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import {
  createMilestone,
  deleteMilestone,
  listMilestones,
  reorderMilestones,
  updateMilestone,
} from '../services/milestones';

export function registerMilestoneRoutes(app: Hono, db: Db): void {
  app.get('/api/projects/:id/milestones', (c) =>
    c.json({ milestones: listMilestones(db, c.req.param('id')) }),
  );

  app.post('/api/projects/:id/milestones', async (c) => {
    const parsed = createMilestoneBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ milestone: createMilestone(db, c.req.param('id'), parsed.data) }, 201);
  });

  app.post('/api/projects/:id/milestones/reorder', async (c) => {
    const parsed = reorderMilestonesBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    listMilestones(db, c.req.param('id'));
    return c.json({ reordered: reorderMilestones(db, c.req.param('id'), parsed.data.ids) });
  });

  app.patch('/api/milestones/:id', async (c) => {
    const parsed = updateMilestoneBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ milestone: updateMilestone(db, c.req.param('id'), parsed.data) });
  });

  app.delete('/api/milestones/:id', (c) =>
    c.json({ movedToInbox: deleteMilestone(db, c.req.param('id')) }),
  );
}
