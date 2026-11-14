import {
  milestoneListSchema,
  milestoneResponseSchema,
  projectListSchema,
  projectResponseSchema,
} from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { milestones, statuses, tasks } from '../db/schema';
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

async function post(path: string, body: unknown): Promise<{ response: Response; body: any }> {
  const response = await app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

async function patch(path: string, body: unknown): Promise<{ response: Response; body: any }> {
  const response = await app.request(path, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

async function createProject(name: string) {
  return projectResponseSchema.parse((await post('/api/projects', { name })).body).project;
}

async function createMilestone(projectId: string, name: string) {
  return milestoneResponseSchema.parse(
    (await post(`/api/projects/${projectId}/milestones`, { name })).body,
  ).milestone;
}

function statusIdByName(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`Status "${name}" is not seeded`);
  return row.id;
}

describe('POST /api/projects', () => {
  it('creates a project with defaults and the next position', async () => {
    const first = await createProject('Onboarding');
    const second = await createProject('Renewals');

    expect(first).toMatchObject({
      name: 'Onboarding',
      description: '',
      targetDate: null,
      archived: false,
      aiExcluded: false,
      position: 0,
      progress: { done: 0, total: 0, percent: 0, currentMilestone: null, nextDueTask: null },
    });
    expect(second.position).toBe(1);
  });

  it('rejects an empty name', async () => {
    const { response } = await post('/api/projects', { name: '   ' });
    expect(response.status).toBe(400);
  });
});

describe('GET /api/projects', () => {
  it('lists active projects in position order and separates archived ones', async () => {
    const alpha = await createProject('Alpha');
    await createProject('Beta');
    await patch(`/api/projects/${alpha.id}`, { archived: true });

    const active = projectListSchema.parse(await (await app.request('/api/projects')).json());
    expect(active.projects.map((project) => project.name)).toEqual(['Beta']);

    const archived = projectListSchema.parse(
      await (await app.request('/api/projects?archived=true')).json(),
    );
    expect(archived.projects.map((project) => project.name)).toEqual(['Alpha']);
  });

  it('derives progress, current milestone and the next due task', async () => {
    const project = await createProject('Onboarding');
    const phaseOne = await createMilestone(project.id, 'Phase 1');
    await createMilestone(project.id, 'Phase 2');

    const open = statusIdByName('To do');
    const done = statusIdByName('Done');

    db.insert(tasks)
      .values([
        {
          title: 'Finished',
          projectId: project.id,
          milestoneId: phaseOne.id,
          statusId: done,
          completedAt: '2026-11-10T00:00:00.000Z',
          dueDate: '2026-11-01',
        },
        {
          title: 'Later',
          projectId: project.id,
          milestoneId: phaseOne.id,
          statusId: open,
          dueDate: '2026-11-20',
        },
        { title: 'Sooner', projectId: project.id, statusId: open, dueDate: '2026-11-14' },
        { title: 'Undated', projectId: project.id, statusId: open },
      ])
      .run();

    const body = projectResponseSchema.parse(
      await (await app.request(`/api/projects/${project.id}`)).json(),
    ).project;

    expect(body.progress).toMatchObject({ done: 1, total: 4, percent: 25 });
    expect(body.progress.currentMilestone).toEqual({ id: phaseOne.id, name: 'Phase 1' });
    expect(body.progress.nextDueTask).toMatchObject({ title: 'Sooner', dueDate: '2026-11-14' });
  });

  it('counts a task as done when its status is set to Done by PATCH', async () => {
    const project = await createProject('Onboarding');
    await post('/api/tasks', { title: 'Only task', projectId: project.id });

    const list = (await (await app.request(`/api/tasks?project=${project.id}`)).json()) as any;
    const taskId = list.tasks[0].id as string;

    await patch(`/api/tasks/${taskId}`, { statusId: statusIdByName('Done') });

    const body = projectResponseSchema.parse(
      await (await app.request(`/api/projects/${project.id}`)).json(),
    ).project;

    expect(body.progress).toMatchObject({ done: 1, total: 1, percent: 100 });
  });

  it('moves to the next milestone once one is completed', async () => {
    const project = await createProject('Onboarding');
    const phaseOne = await createMilestone(project.id, 'Phase 1');
    const phaseTwo = await createMilestone(project.id, 'Phase 2');

    await patch(`/api/milestones/${phaseOne.id}`, { completedAt: '2026-11-12T00:00:00.000Z' });

    const body = projectResponseSchema.parse(
      await (await app.request(`/api/projects/${project.id}`)).json(),
    ).project;

    expect(body.progress.currentMilestone).toEqual({ id: phaseTwo.id, name: 'Phase 2' });
  });
});

describe('PATCH /api/projects/:id', () => {
  it('updates editable fields and clears the target date with null', async () => {
    const project = await createProject('Onboarding');
    await patch(`/api/projects/${project.id}`, { targetDate: '2026-12-01' });

    const { response, body } = await patch(`/api/projects/${project.id}`, {
      name: 'Onboarding v2',
      description: 'Everything a new hire needs.',
      targetDate: null,
      aiExcluded: true,
    });

    expect(response.status).toBe(200);
    const updated = projectResponseSchema.parse(body).project;
    expect(updated).toMatchObject({
      name: 'Onboarding v2',
      description: 'Everything a new hire needs.',
      targetDate: null,
      aiExcluded: true,
    });
  });

  it('returns 404 for an unknown project', async () => {
    const { response } = await patch('/api/projects/missing', { name: 'Nope' });
    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/projects/:id', () => {
  it('keeps the tasks by moving them to the Inbox and removes the milestones', async () => {
    const project = await createProject('Onboarding');
    const milestone = await createMilestone(project.id, 'Phase 1');

    const created = await post('/api/tasks', {
      title: 'Draft the plan',
      projectId: project.id,
      milestoneId: milestone.id,
    });
    const taskId = (await created.body).task.id as string;

    const response = await app.request(`/api/projects/${project.id}`, { method: 'DELETE' });
    expect(response.status).toBe(204);

    const inbox = (await (await app.request('/api/tasks?project=none')).json()) as any;
    expect(inbox.tasks.map((task: { id: string }) => task.id)).toEqual([taskId]);
    expect(inbox.tasks[0]).toMatchObject({ projectId: null, milestoneId: null });

    const remaining = db
      .select({ id: milestones.id })
      .from(milestones)
      .where(eq(milestones.projectId, project.id))
      .all();
    expect(remaining).toEqual([]);

    const gone = await app.request(`/api/projects/${project.id}`);
    expect(gone.status).toBe(404);
  });
});

describe('milestones', () => {
  it('creates, lists in position order and counts tasks', async () => {
    const project = await createProject('Onboarding');
    const phaseOne = await createMilestone(project.id, 'Phase 1');
    const phaseTwo = await createMilestone(project.id, 'Phase 2');

    await post('/api/tasks', { title: 'One', projectId: project.id, milestoneId: phaseTwo.id });
    const done = await post('/api/tasks', {
      title: 'Two',
      projectId: project.id,
      milestoneId: phaseTwo.id,
    });
    await app.request(`/api/tasks/${(await done.body).task.id}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const body = milestoneListSchema.parse(
      await (await app.request(`/api/projects/${project.id}/milestones`)).json(),
    );

    expect(body.milestones.map((milestone) => milestone.id)).toEqual([phaseOne.id, phaseTwo.id]);
    expect(body.milestones[1]).toMatchObject({ done: 1, total: 2 });
  });

  it('deletes a milestone and moves its tasks to the Inbox', async () => {
    const project = await createProject('Onboarding');
    const milestone = await createMilestone(project.id, 'Phase 1');
    const created = await post('/api/tasks', {
      title: 'Draft',
      projectId: project.id,
      milestoneId: milestone.id,
    });
    const taskId = (await created.body).task.id as string;
    await post('/api/tasks', { title: 'Stays', projectId: project.id });

    const response = await app.request(`/api/milestones/${milestone.id}`, { method: 'DELETE' });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ movedToInbox: 1 });

    const projectTasks = (await (
      await app.request(`/api/tasks?project=${project.id}`)
    ).json()) as any;
    expect(projectTasks.tasks.map((task: any) => task.title)).toEqual(['Stays']);

    const moved = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    expect(moved).toMatchObject({ projectId: null, milestoneId: null });
  });

  it('reports 404 when deleting an unknown milestone', async () => {
    const response = await app.request('/api/milestones/missing', { method: 'DELETE' });
    expect(response.status).toBe(404);
  });

  it('reorders milestones to match the submitted order', async () => {
    const project = await createProject('Onboarding');
    const one = await createMilestone(project.id, 'Phase 1');
    const two = await createMilestone(project.id, 'Phase 2');
    const three = await createMilestone(project.id, 'Phase 3');

    const { response, body } = await post(`/api/projects/${project.id}/milestones/reorder`, {
      ids: [three.id, one.id, two.id],
    });
    expect(response.status).toBe(200);
    expect(body).toEqual({ reordered: 3 });

    const list = milestoneListSchema.parse(
      await (await app.request(`/api/projects/${project.id}/milestones`)).json(),
    );
    expect(list.milestones.map((milestone) => milestone.name)).toEqual([
      'Phase 3',
      'Phase 1',
      'Phase 2',
    ]);
  });

  it('rejects a reorder that is missing, repeats or borrows milestones', async () => {
    const project = await createProject('Onboarding');
    const other = await createProject('Other');
    const one = await createMilestone(project.id, 'Phase 1');
    const two = await createMilestone(project.id, 'Phase 2');
    const foreign = await createMilestone(other.id, 'Elsewhere');
    const path = `/api/projects/${project.id}/milestones/reorder`;

    expect((await post(path, { ids: [one.id] })).response.status).toBe(400);
    expect((await post(path, { ids: [one.id, one.id] })).response.status).toBe(400);
    expect((await post(path, { ids: [one.id, foreign.id] })).response.status).toBe(400);
    expect((await post(path, { ids: [two.id, one.id] })).response.status).toBe(200);
    expect(
      (await post('/api/projects/missing/milestones/reorder', { ids: [one.id] })).response.status,
    ).toBe(404);
  });

  it('reports 404 for a milestone on an unknown project', async () => {
    const response = await app.request('/api/projects/missing/milestones');
    expect(response.status).toBe(404);
  });
});
