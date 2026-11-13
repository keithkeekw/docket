import { taskListSchema, taskResponseSchema, statusListSchema } from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { milestones, projects, statuses } from '../db/schema';
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

function statusIdByName(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`Status "${name}" is not seeded`);
  return row.id;
}

async function createTask(body: Record<string, unknown>) {
  const response = await app.request('/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

async function listTasks(query = '') {
  const response = await app.request(`/api/tasks${query}`);
  return { response, body: taskListSchema.parse(await response.json()) };
}

describe('GET /api/statuses', () => {
  it('returns the seeded statuses in configured order', async () => {
    const response = await app.request('/api/statuses');

    expect(response.status).toBe(200);
    const body = statusListSchema.parse(await response.json());
    expect(body.statuses.map((status) => status.name)).toEqual([
      'Backlog',
      'To do',
      'In progress',
      'Waiting',
      'Done',
    ]);
  });
});

describe('POST /api/tasks', () => {
  it('saves a plain title to the Inbox with the default status and priority', async () => {
    const { response, body } = await createTask({ title: '  Reply on vendor escalation  ' });

    expect(response.status).toBe(201);
    const task = taskResponseSchema.parse(body).task;

    expect(task).toMatchObject({
      title: 'Reply on vendor escalation',
      projectId: null,
      projectName: null,
      milestoneId: null,
      statusName: 'To do',
      statusCategory: 'open',
      priority: 3,
      dueDate: null,
      dueTime: null,
      estimateMinutes: null,
      completedAt: null,
    });
  });

  it('appends after existing Inbox tasks', async () => {
    const first = taskResponseSchema.parse((await createTask({ title: 'First' })).body).task;
    const second = taskResponseSchema.parse((await createTask({ title: 'Second' })).body).task;

    const { body } = await listTasks('?project=none');
    expect(body.tasks.map((task) => task.id)).toEqual([first.id, second.id]);
  });

  it('rejects an empty title and unknown fields', async () => {
    const empty = await createTask({ title: '   ' });
    expect(empty.response.status).toBe(400);

    const unknown = await createTask({ title: 'Valid', aiGenerated: true });
    expect(unknown.response.status).toBe(400);
  });

  it('accepts full field input and rejects a milestone without its project', async () => {
    const project = db.insert(projects).values({ name: 'Onboarding' }).returning().get();
    const milestone = db
      .insert(milestones)
      .values({ projectId: project.id, name: 'Phase 1' })
      .returning()
      .get();

    const orphan = await createTask({
      title: 'Orphan',
      milestoneId: milestone.id,
    });
    expect(orphan.response.status).toBe(400);

    const valid = await createTask({
      title: 'Draft plan',
      projectId: project.id,
      milestoneId: milestone.id,
      priority: 1,
      dueDate: '2026-11-16',
      dueTime: '10:00',
      estimateMinutes: 30,
    });
    expect(valid.response.status).toBe(201);

    const task = taskResponseSchema.parse(valid.body).task;
    expect(task).toMatchObject({
      projectName: 'Onboarding',
      milestoneId: milestone.id,
      priority: 1,
      dueDate: '2026-11-16',
      dueTime: '10:00',
      estimateMinutes: 30,
    });
  });

  it('rejects a milestone that belongs to another project', async () => {
    const alpha = db.insert(projects).values({ name: 'Alpha' }).returning().get();
    const beta = db.insert(projects).values({ name: 'Beta' }).returning().get();
    const milestone = db
      .insert(milestones)
      .values({ projectId: alpha.id, name: 'Alpha phase' })
      .returning()
      .get();

    const { response } = await createTask({
      title: 'Wrong project',
      projectId: beta.id,
      milestoneId: milestone.id,
    });

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('updates fields and clears nullable ones with null', async () => {
    const task = taskResponseSchema.parse(
      (await createTask({ title: 'Draft', dueDate: '2026-11-16', estimateMinutes: 30 })).body,
    ).task;

    const response = await app.request(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Final', dueDate: null, statusId: statusIdByName('In progress') }),
    });

    expect(response.status).toBe(200);
    const updated = taskResponseSchema.parse(await response.json()).task;

    expect(updated).toMatchObject({
      title: 'Final',
      dueDate: null,
      estimateMinutes: 30,
      statusName: 'In progress',
    });
    expect(updated.updatedAt >= task.updatedAt).toBe(true);
  });

  it('clears the milestone when the task leaves its project', async () => {
    const project = db.insert(projects).values({ name: 'Onboarding' }).returning().get();
    const milestone = db
      .insert(milestones)
      .values({ projectId: project.id, name: 'Phase 1' })
      .returning()
      .get();
    const task = taskResponseSchema.parse(
      (await createTask({ title: 'Draft', projectId: project.id, milestoneId: milestone.id })).body,
    ).task;

    const response = await app.request(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: null }),
    });

    const updated = taskResponseSchema.parse(await response.json()).task;
    expect(updated.projectId).toBeNull();
    expect(updated.milestoneId).toBeNull();
  });

  it('returns 404 for an unknown task', async () => {
    const response = await app.request('/api/tasks/missing', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Nope' }),
    });

    expect(response.status).toBe(404);
  });
});

describe('POST /api/tasks/:id/complete', () => {
  it('moves the task to the first done status and back to To do', async () => {
    const task = taskResponseSchema.parse((await createTask({ title: 'Finish me' })).body).task;

    const doneResponse = await app.request(`/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const done = taskResponseSchema.parse(await doneResponse.json()).task;

    expect(done.statusName).toBe('Done');
    expect(done.statusCategory).toBe('done');
    expect(done.completedAt).not.toBeNull();

    const undoneResponse = await app.request(`/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ done: false }),
    });
    const undone = taskResponseSchema.parse(await undoneResponse.json()).task;

    expect(undone.statusName).toBe('To do');
    expect(undone.completedAt).toBeNull();
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('removes the task and then reports it missing', async () => {
    const task = taskResponseSchema.parse((await createTask({ title: 'Throw away' })).body).task;

    const first = await app.request(`/api/tasks/${task.id}`, { method: 'DELETE' });
    expect(first.status).toBe(204);

    const second = await app.request(`/api/tasks/${task.id}`, { method: 'DELETE' });
    expect(second.status).toBe(404);

    const { body } = await listTasks();
    expect(body.tasks).toHaveLength(0);
  });
});

describe('GET /api/tasks', () => {
  it('sorts open tasks by due date and sinks completed ones', async () => {
    const undated = taskResponseSchema.parse((await createTask({ title: 'Undated' })).body).task;
    const later = taskResponseSchema.parse(
      (await createTask({ title: 'Later', dueDate: '2026-11-20' })).body,
    ).task;
    const sooner = taskResponseSchema.parse(
      (await createTask({ title: 'Sooner', dueDate: '2026-11-14' })).body,
    ).task;
    const finished = taskResponseSchema.parse(
      (await createTask({ title: 'Finished', dueDate: '2026-11-01' })).body,
    ).task;

    await app.request(`/api/tasks/${finished.id}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const { body } = await listTasks();
    expect(body.tasks.map((task) => task.title)).toEqual([
      sooner.title,
      later.title,
      undated.title,
      'Finished',
    ]);
  });

  it('filters by due date and searches title and notes', async () => {
    await createTask({ title: 'Reply on vendor escalation', notes: 'ZD-48213', dueDate: '2026-11-12' });
    await createTask({ title: 'Draft escalation matrix', dueDate: '2026-11-30' });

    const due = await listTasks('?due_to=2026-11-14');
    expect(due.body.tasks.map((task) => task.title)).toEqual(['Reply on vendor escalation']);

    const search = await listTasks('?q=ZD-48213');
    expect(search.body.tasks.map((task) => task.title)).toEqual(['Reply on vendor escalation']);
  });
});

describe('PATCH /api/tasks/:id status ↔ completion', () => {
  it('stamps completed_at when the status moves to a done category', async () => {
    const task = taskResponseSchema.parse(
      (await createTask({ title: 'Finish by status' })).body,
    ).task;

    const response = await app.request(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ statusId: statusIdByName('Done') }),
    });

    const done = taskResponseSchema.parse(await response.json()).task;
    expect(done.statusCategory).toBe('done');
    expect(done.completedAt).not.toBeNull();
  });

  it('clears completed_at when the status leaves the done category', async () => {
    const task = taskResponseSchema.parse(
      (await createTask({ title: 'Reopen by status' })).body,
    ).task;

    await app.request(`/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await app.request(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ statusId: statusIdByName('In progress') }),
    });

    const reopened = taskResponseSchema.parse(await response.json()).task;
    expect(reopened.statusCategory).toBe('active');
    expect(reopened.completedAt).toBeNull();
  });
});

describe('GET /api/tasks filters', () => {
  it('filters by status and priority together', async () => {
    const backlog = statusIdByName('Backlog');
    const open = statusIdByName('To do');

    await createTask({ title: 'Backlog P1', statusId: backlog, priority: 1 });
    await createTask({ title: 'To do P1', statusId: open, priority: 1 });
    await createTask({ title: 'To do P2', statusId: open, priority: 2 });

    const backlogOnly = await listTasks(`?status=${backlog}`);
    expect(backlogOnly.body.tasks.map((task) => task.title)).toEqual(['Backlog P1']);

    const both = await listTasks(`?status=${backlog},${open}&priority=1`);
    expect(both.body.tasks.map((task) => task.title)).toEqual(['Backlog P1', 'To do P1']);
  });

  it('filters by due range and ignores invalid priorities', async () => {
    await createTask({ title: 'Early', dueDate: '2026-11-10', priority: 1 });
    await createTask({ title: 'Middle', dueDate: '2026-11-15' });
    await createTask({ title: 'Late', dueDate: '2026-11-30' });
    await createTask({ title: 'Undated' });

    const range = await listTasks('?due_from=2026-11-11&due_to=2026-11-20');
    expect(range.body.tasks.map((task) => task.title)).toEqual(['Middle']);

    const invalidPriority = await listTasks('?priority=9');
    expect(invalidPriority.body.tasks).toHaveLength(4);
  });

  it('returns the milestone name for the table column', async () => {
    const project = db.insert(projects).values({ name: 'Onboarding' }).returning().get();
    const milestone = db
      .insert(milestones)
      .values({ projectId: project.id, name: 'Phase 1' })
      .returning()
      .get();

    await createTask({
      title: 'Scoped work',
      projectId: project.id,
      milestoneId: milestone.id,
    });

    const { body } = await listTasks();
    expect(body.tasks[0]).toMatchObject({
      milestoneName: 'Phase 1',
      projectName: 'Onboarding',
    });
  });
});
