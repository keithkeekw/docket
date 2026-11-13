import {
  statusListSchema,
  statusResponseSchema,
  taskListSchema,
  taskResponseSchema,
} from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { statuses } from '../db/schema';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
  app = createApp(db);
});

afterEach(() => {
  sqlite.close();
});

const json = { 'content-type': 'application/json' };

async function send(method: 'POST' | 'PATCH', path: string, body: unknown) {
  const response = await app.request(path, { method, headers: json, body: JSON.stringify(body) });
  return { response, body: (await response.json()) as any };
}

async function listStatuses() {
  return statusListSchema.parse(await (await app.request('/api/statuses')).json()).statuses;
}

function statusIdByName(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`Status "${name}" is not seeded`);
  return row.id;
}

async function createTask(body: Record<string, unknown>) {
  return taskResponseSchema.parse((await send('POST', '/api/tasks', body)).body).task;
}

describe('POST /api/statuses', () => {
  it('appends a status at the end and returns its task count', async () => {
    const { response, body } = await send('POST', '/api/statuses', {
      name: 'Blocked',
      category: 'active',
    });

    expect(response.status).toBe(201);
    const status = statusResponseSchema.parse(body).status;
    expect(status).toMatchObject({
      name: 'Blocked',
      category: 'active',
      position: 5,
      taskCount: 0,
    });
  });

  it('rejects a duplicate name regardless of case', async () => {
    const { response } = await send('POST', '/api/statuses', { name: 'to DO', category: 'open' });
    expect(response.status).toBe(400);
  });

  it('rejects an unknown category and an empty name', async () => {
    expect(
      (await send('POST', '/api/statuses', { name: 'X', category: 'nope' })).response.status,
    ).toBe(400);
    expect(
      (await send('POST', '/api/statuses', { name: '  ', category: 'open' })).response.status,
    ).toBe(400);
  });
});

describe('PATCH /api/statuses/:id', () => {
  it('renames and reorders', async () => {
    const id = statusIdByName('Backlog');

    const renamed = statusResponseSchema.parse(
      (await send('PATCH', `/api/statuses/${id}`, { name: 'Later', position: 4 })).body,
    ).status;

    expect(renamed).toMatchObject({ name: 'Later', position: 4 });
  });

  it('keeps completed_at in step when the category changes', async () => {
    const id = statusIdByName('In progress');
    const task = await createTask({ title: 'In flight', statusId: id });

    await send('PATCH', `/api/statuses/${id}`, { category: 'done' });

    const done = taskListSchema
      .parse(await (await app.request('/api/tasks?completed=all')).json())
      .tasks.find((entry) => entry.id === task.id);
    expect(done?.statusCategory).toBe('done');
    expect(done?.completedAt).not.toBeNull();

    await send('PATCH', `/api/statuses/${id}`, { category: 'active' });

    const reopened = taskListSchema
      .parse(await (await app.request('/api/tasks?completed=all')).json())
      .tasks.find((entry) => entry.id === task.id);
    expect(reopened?.completedAt).toBeNull();
  });

  it('returns 404 for an unknown status', async () => {
    expect((await send('PATCH', '/api/statuses/missing', { name: 'X' })).response.status).toBe(404);
  });
});

describe('DELETE /api/statuses/:id', () => {
  it('refuses to remove a status that still has tasks', async () => {
    const id = statusIdByName('Waiting');
    await createTask({ title: 'Held', statusId: id });

    const response = await app.request(`/api/statuses/${id}`, { method: 'DELETE' });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: 'A status in use cannot be removed until its 1 task moves to another status',
    });
  });

  it('removes an unused status', async () => {
    const id = statusIdByName('Waiting');
    const response = await app.request(`/api/statuses/${id}`, { method: 'DELETE' });

    expect(response.status).toBe(204);
    expect((await listStatuses()).map((status) => status.name)).toEqual([
      'Backlog',
      'To do',
      'In progress',
      'Done',
    ]);
  });

  it('never removes the last status', async () => {
    for (const status of await listStatuses()) {
      await app.request(`/api/statuses/${status.id}`, { method: 'DELETE' });
    }

    const remaining = await listStatuses();
    expect(remaining).toHaveLength(1);

    const response = await app.request(`/api/statuses/${remaining[0]?.id}`, { method: 'DELETE' });
    expect(response.status).toBe(400);
  });
});
