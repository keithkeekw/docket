import {
  completeTaskBodySchema,
  createTaskBodySchema,
  moveTaskBodySchema,
  updateTaskBodySchema,
} from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import {
  createTask,
  deleteTask,
  getTaskDetail,
  listTasks,
  moveTask,
  setTaskDone,
  updateTask,
} from '../services/tasks';

export function registerTaskRoutes(app: Hono, db: Db): void {
  app.get('/api/tasks', (c) => {
    const project = c.req.query('project');
    const dueTo = c.req.query('due_to');
    const q = c.req.query('q')?.trim();
    const tag = c.req.query('tag')?.trim();

    return c.json({
      tasks: listTasks(db, {
        project: project === undefined ? undefined : project,
        dueTo: dueTo || undefined,
        q: q || undefined,
        tag: tag || undefined,
      }),
    });
  });

  app.get('/api/tasks/:id', (c) => c.json({ task: getTaskDetail(db, c.req.param('id')) }));

  app.post('/api/tasks', async (c) => {
    const parsed = createTaskBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ task: createTask(db, parsed.data) }, 201);
  });

  app.patch('/api/tasks/:id', async (c) => {
    const parsed = updateTaskBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ task: updateTask(db, c.req.param('id'), parsed.data) });
  });

  // Separate from PATCH because completion also stamps `completed_at` and will
  // create the next recurrence occurrence in M1-S8 (FR-15).
  app.post('/api/tasks/:id/complete', async (c) => {
    const parsed = completeTaskBodySchema.safeParse((await readJson(c)) ?? {});
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ task: setTaskDone(db, c.req.param('id'), parsed.data.done) });
  });

  app.post('/api/tasks/:id/move', async (c) => {
    const parsed = moveTaskBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ task: moveTask(db, c.req.param('id'), parsed.data) });
  });

  app.delete('/api/tasks/:id', (c) => {
    deleteTask(db, c.req.param('id'));
    return c.body(null, 204);
  });
}
