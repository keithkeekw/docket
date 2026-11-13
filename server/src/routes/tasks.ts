import {
  bulkDeleteTasksBodySchema,
  completeTaskBodySchema,
  createTaskBodySchema,
  moveTaskBodySchema,
  reorderTasksBodySchema,
  updateTaskBodySchema,
} from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import {
  createTask,
  deleteTask,
  deleteTasks,
  getTaskDetail,
  listTasks,
  moveTask,
  reorderTasks,
  setTaskDone,
  updateTask,
} from '../services/tasks';

/** `?status=a,b` — repeated values are not used so URLs stay short. */
function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function registerTaskRoutes(app: Hono, db: Db): void {
  app.get('/api/tasks', (c) => {
    const project = c.req.query('project');
    const dueFrom = c.req.query('due_from');
    const dueTo = c.req.query('due_to');
    const q = c.req.query('q')?.trim();
    const tag = c.req.query('tag')?.trim();
    const statusIds = splitList(c.req.query('status'));
    const priorities = splitList(c.req.query('priority'))
      .map(Number)
      .filter((value) => value === 1 || value === 2 || value === 3);
    const completedParam = c.req.query('completed');
    const completed =
      completedParam === 'only' || completedParam === 'all' ? completedParam : 'exclude';

    return c.json({
      tasks: listTasks(db, {
        project: project === undefined ? undefined : project,
        statusIds: statusIds.length > 0 ? statusIds : undefined,
        priorities: priorities.length > 0 ? priorities : undefined,
        dueFrom: dueFrom || undefined,
        dueTo: dueTo || undefined,
        q: q || undefined,
        tag: tag || undefined,
        completed,
      }),
    });
  });

  app.get('/api/tasks/:id', (c) => c.json({ task: getTaskDetail(db, c.req.param('id')) }));

  app.post('/api/tasks', async (c) => {
    const parsed = createTaskBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ task: createTask(db, parsed.data) }, 201);
  });

  app.post('/api/tasks/reorder', async (c) => {
    const parsed = reorderTasksBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ reordered: reorderTasks(db, parsed.data.ids) });
  });

  app.post('/api/tasks/bulk-delete', async (c) => {
    const parsed = bulkDeleteTasksBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ deleted: deleteTasks(db, parsed.data.ids) });
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
