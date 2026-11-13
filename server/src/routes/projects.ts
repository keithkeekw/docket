import { createProjectBodySchema, updateProjectBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { createProject, deleteProject, getProject, listProjects, updateProject } from '../services/projects';

export function registerProjectRoutes(app: Hono, db: Db): void {
  app.get('/api/projects', (c) => {
    const archived = c.req.query('archived');

    return c.json({
      projects: listProjects(db, {
        archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
      }),
    });
  });

  app.get('/api/projects/:id', (c) => c.json({ project: getProject(db, c.req.param('id')) }));

  app.post('/api/projects', async (c) => {
    const parsed = createProjectBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ project: createProject(db, parsed.data) }, 201);
  });

  app.patch('/api/projects/:id', async (c) => {
    const parsed = updateProjectBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ project: updateProject(db, c.req.param('id'), parsed.data) });
  });

  app.delete('/api/projects/:id', (c) => {
    deleteProject(db, c.req.param('id'));
    return c.body(null, 204);
  });
}
