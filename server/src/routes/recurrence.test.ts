import { taskDetailResponseSchema, taskListSchema, taskResponseSchema } from '@app/shared';
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

async function send(method: 'POST' | 'PATCH' | 'PUT', path: string, body: unknown) {
  const response = await app.request(path, { method, headers: json, body: JSON.stringify(body) });
  return { response, body: (await response.json()) as any };
}

async function createTask(body: Record<string, unknown>) {
  return taskResponseSchema.parse((await send('POST', '/api/tasks', body)).body).task;
}

async function allTasks() {
  return taskListSchema.parse(await (await app.request('/api/tasks?completed=all')).json()).tasks;
}

function statusIdByName(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`Status "${name}" is not seeded`);
  return row.id;
}

describe('recurring tasks (FR-15)', () => {
  it('creates the next occurrence when the task is completed', async () => {
    const task = await createTask({
      title: 'Weekly review',
      dueDate: '2026-11-13',
      dueTime: '16:00',
      priority: 2,
      estimateMinutes: 30,
      recurrenceRule: 'FREQ=WEEKLY',
    });

    await send('POST', `/api/tasks/${task.id}/complete`, {});

    const tasks = await allTasks();
    expect(tasks).toHaveLength(2);

    const next = tasks.find((entry) => entry.id !== task.id);
    expect(next).toMatchObject({
      title: 'Weekly review',
      dueDate: '2026-11-20',
      dueTime: '16:00',
      priority: 2,
      estimateMinutes: 30,
      recurrenceRule: 'FREQ=WEEKLY',
      statusName: 'To do',
      completedAt: null,
    });

    const original = tasks.find((entry) => entry.id === task.id);
    expect(original).toMatchObject({ statusName: 'Done', recurrenceParentId: null });
  });

  it('moves the planned start and end dates along with the due date', async () => {
    const task = await createTask({
      title: 'Weekly report',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      dueDate: '2026-11-13',
      recurrenceRule: 'FREQ=WEEKLY',
    });

    await send('POST', `/api/tasks/${task.id}/complete`, {});

    const next = (await allTasks()).find((entry) => entry.id !== task.id);
    expect(next).toMatchObject({
      startDate: '2026-11-17',
      endDate: '2026-11-19',
      dueDate: '2026-11-20',
    });
  });

  it('copies links and tags, and the checklist unticked', async () => {
    const task = await createTask({
      title: 'Prep the retro',
      dueDate: '2026-11-13',
      recurrenceRule: 'FREQ=DAILY',
    });

    await send('POST', `/api/tasks/${task.id}/checklist`, { title: 'Collect notes' });
    await send('POST', `/api/tasks/${task.id}/links`, {
      url: 'https://acme.atlassian.net/browse/OPS-112',
    });
    await send('PUT', `/api/tasks/${task.id}/tags`, { tags: ['ritual'] });
    await send('POST', `/api/tasks/${task.id}/complete`, {});

    const next = (await allTasks()).find((entry) => entry.id !== task.id);
    if (!next) throw new Error('no next occurrence');

    const detail = taskDetailResponseSchema.parse(
      await (await app.request(`/api/tasks/${next.id}`)).json(),
    ).task;

    expect(detail.links.map((link) => link.label)).toEqual(['OPS-112']);
    expect(detail.tags).toEqual(['ritual']);
    expect(detail.checklistItems.map((item) => item.title)).toEqual(['Collect notes']);
    expect(detail.checklistItems[0]?.done).toBe(false);
  });

  it('points the next occurrence at the first task in the series', async () => {
    const task = await createTask({
      title: 'Daily standup',
      dueDate: '2026-11-13',
      recurrenceRule: 'FREQ=DAILY',
    });

    await send('POST', `/api/tasks/${task.id}/complete`, {});
    const second = (await allTasks()).find((entry) => entry.id !== task.id);
    if (!second) throw new Error('no second occurrence');

    await send('POST', `/api/tasks/${second.id}/complete`, {});

    const third = (await allTasks()).find(
      (entry) => entry.id !== task.id && entry.id !== second.id,
    );
    expect(third?.dueDate).toBe('2026-11-15');
    expect(third?.recurrenceParentId).toBe(task.id);
  });

  it('does not duplicate the occurrence when a task is re-ticked', async () => {
    const task = await createTask({
      title: 'Water plants',
      dueDate: '2026-11-13',
      recurrenceRule: 'FREQ=DAILY',
    });

    await send('POST', `/api/tasks/${task.id}/complete`, {});
    await send('POST', `/api/tasks/${task.id}/complete`, { done: false });
    await send('POST', `/api/tasks/${task.id}/complete`, {});

    expect(await allTasks()).toHaveLength(2);
  });

  it('creates the next occurrence when the status is set to Done instead', async () => {
    const task = await createTask({
      title: 'Monthly report',
      dueDate: '2026-01-15',
      recurrenceRule: 'FREQ=MONTHLY',
    });

    await send('PATCH', `/api/tasks/${task.id}`, { statusId: statusIdByName('Done') });

    const next = (await allTasks()).find((entry) => entry.id !== task.id);
    expect(next?.dueDate).toBe('2026-02-15');
  });

  it('does not create a recurrence for a non-recurring task', async () => {
    const task = await createTask({ title: 'One off', dueDate: '2026-11-13' });
    await send('POST', `/api/tasks/${task.id}/complete`, {});

    expect(await allTasks()).toHaveLength(1);
  });

  it('does not create an occurrence without a due date', async () => {
    const task = await createTask({ title: 'Undated ritual', recurrenceRule: 'FREQ=DAILY' });
    await send('POST', `/api/tasks/${task.id}/complete`, {});

    expect(await allTasks()).toHaveLength(1);
  });

  it('clears the rule when it is set to null', async () => {
    const task = await createTask({
      title: 'Temporary',
      dueDate: '2026-11-13',
      recurrenceRule: 'FREQ=DAILY',
    });

    await send('PATCH', `/api/tasks/${task.id}`, { recurrenceRule: null });
    await send('POST', `/api/tasks/${task.id}/complete`, {});

    expect(await allTasks()).toHaveLength(1);
  });
});
