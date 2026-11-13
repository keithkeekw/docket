import {
  checklistItemResponseSchema,
  taskDetailResponseSchema,
  taskListSchema,
  taskResponseSchema,
  taskTagsResponseSchema,
} from '@app/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
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

async function send(
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  body: unknown,
): Promise<{ response: Response; body: any }> {
  const response = await app.request(path, {
    method,
    headers: json,
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

async function createTask(body: Record<string, unknown>) {
  return taskResponseSchema.parse((await send('POST', '/api/tasks', body)).body).task;
}

async function createProject(name: string) {
  return (await send('POST', '/api/projects', { name })).body.project as { id: string };
}

async function createMilestone(projectId: string, name: string) {
  return (await send('POST', `/api/projects/${projectId}/milestones`, { name })).body.milestone as {
    id: string;
  };
}

async function detail(id: string) {
  return taskDetailResponseSchema.parse(await (await app.request(`/api/tasks/${id}`)).json()).task;
}

describe('GET /api/tasks/:id', () => {
  it('returns links and checklist items with the task', async () => {
    const task = await createTask({ title: 'Draft plan' });

    await send('POST', `/api/tasks/${task.id}/links`, { url: 'https://acme.zendesk.com/tickets/48213' });
    await send('POST', `/api/tasks/${task.id}/checklist`, { title: 'Outline' });

    const body = await detail(task.id);
    expect(body.links).toHaveLength(1);
    expect(body.checklistItems.map((item) => item.title)).toEqual(['Outline']);
  });

  it('returns 404 for an unknown task', async () => {
    const response = await app.request('/api/tasks/missing');
    expect(response.status).toBe(404);
  });
});

describe('checklist items (FR-8)', () => {
  it('adds items in order and reports progress on the task row', async () => {
    const task = await createTask({ title: 'Draft plan' });

    const first = checklistItemResponseSchema.parse(
      (await send('POST', `/api/tasks/${task.id}/checklist`, { title: 'Outline' })).body,
    ).item;
    await send('POST', `/api/tasks/${task.id}/checklist`, { title: 'Review' });

    const list = taskListSchema.parse(await (await app.request('/api/tasks')).json());
    expect(list.tasks[0]?.checklist).toEqual({ done: 0, total: 2 });

    await send('PATCH', `/api/checklist/${first.id}`, { done: true });

    const after = taskListSchema.parse(await (await app.request('/api/tasks')).json());
    expect(after.tasks[0]?.checklist).toEqual({ done: 1, total: 2 });

    const items = await detail(task.id);
    expect(items.checklistItems.map((item) => item.title)).toEqual(['Outline', 'Review']);
    expect(items.checklistItems[0]?.done).toBe(true);
  });
  it('renames and deletes items, and rejects an empty title', async () => {
    const task = await createTask({ title: 'Draft plan' });
    const item = checklistItemResponseSchema.parse(
      (await send('POST', `/api/tasks/${task.id}/checklist`, { title: 'Outline' })).body,
    ).item;

    const renamed = checklistItemResponseSchema.parse(
      (await send('PATCH', `/api/checklist/${item.id}`, { title: 'Outline v2' })).body,
    ).item;
    expect(renamed.title).toBe('Outline v2');

    const emptyTitle = await send('PATCH', `/api/checklist/${item.id}`, { title: '  ' });
    expect(emptyTitle.response.status).toBe(400);

    const removed = await app.request(`/api/checklist/${item.id}`, { method: 'DELETE' });
    expect(removed.status).toBe(204);

    const again = await app.request(`/api/checklist/${item.id}`, { method: 'DELETE' });
    expect(again.status).toBe(404);
  });
});

describe('task links (FR-16)', () => {
  it('derives a short label from the URL on save', async () => {
    const task = await createTask({ title: 'Reply on escalation' });

    const zendesk = await send('POST', `/api/tasks/${task.id}/links`, {
      url: 'https://acme.zendesk.com/agent/tickets/48213',
    });
    expect(zendesk.body.link.label).toBe('ZD-48213');

    const jira = await send('POST', `/api/tasks/${task.id}/links`, {
      url: 'https://acme.atlassian.net/browse/OPS-112',
    });
    expect(jira.body.link.label).toBe('OPS-112');
  });

  it('keeps an explicit label and shows the first link on the task row', async () => {
    const task = await createTask({ title: 'Reply on escalation' });

    await send('POST', `/api/tasks/${task.id}/links`, {
      url: 'https://example.com/anything',
      label: 'Runbook',
    });

    const list = taskListSchema.parse(await (await app.request('/api/tasks')).json());
    expect(list.tasks[0]?.link).toMatchObject({ label: 'Runbook' });
  });

  it('rejects an invalid URL and deletes links', async () => {
    const task = await createTask({ title: 'Reply on escalation' });

    const invalid = await send('POST', `/api/tasks/${task.id}/links`, { url: 'not a url' });
    expect(invalid.response.status).toBe(400);

    const link = (await send('POST', `/api/tasks/${task.id}/links`, { url: 'https://example.com/x' }))
      .body.link as { id: string };

    const removed = await app.request(`/api/links/${link.id}`, { method: 'DELETE' });
    expect(removed.status).toBe(204);
  });
});

describe('tags (FR-30)', () => {
  it('creates tags on the fly, de-duplicates and replaces the set', async () => {
    const task = await createTask({ title: 'Reply on escalation' });

    const set = taskTagsResponseSchema.parse(
      (await send('PUT', `/api/tasks/${task.id}/tags`, { tags: ['Vendor', 'vendor', 'Q1'] })).body,
    );
    expect(set.tags).toEqual(['Vendor', 'Q1']);

    const list = taskListSchema.parse(await (await app.request('/api/tasks')).json());
    expect(list.tasks[0]?.tags).toEqual(['Q1', 'Vendor']);

    const tags = (await (await app.request('/api/tags')).json()) as any;
    expect(tags.tags.map((tag: { name: string }) => tag.name)).toEqual(['Q1', 'Vendor']);

    const empty = taskTagsResponseSchema.parse(
      (await send('PUT', `/api/tasks/${task.id}/tags`, { tags: [] })).body,
    );
    expect(empty.tags).toEqual([]);
  });

  it('filters the task list by tag', async () => {
    const tagged = await createTask({ title: 'Reply on escalation' });
    await createTask({ title: 'Unrelated' });
    await send('PUT', `/api/tasks/${tagged.id}/tags`, { tags: ['Vendor'] });

    const filtered = taskListSchema.parse(
      await (await app.request('/api/tasks?tag=Vendor')).json(),
    );
    expect(filtered.tasks.map((task) => task.title)).toEqual(['Reply on escalation']);
  });
});

describe('POST /api/tasks/:id/move (FR-5)', () => {
  it('moves a task from the Inbox into a project and milestone', async () => {
    const project = await createProject('Onboarding');
    const milestone = await createMilestone(project.id, 'Phase 1');
    const task = await createTask({ title: 'Draft plan' });

    const moved = taskResponseSchema.parse(
      (await send('POST', `/api/tasks/${task.id}/move`, {
        projectId: project.id,
        milestoneId: milestone.id,
      })).body,
    ).task;

    expect(moved).toMatchObject({
      projectId: project.id,
      projectName: 'Onboarding',
      milestoneId: milestone.id,
    });

    const inbox = taskListSchema.parse(
      await (await app.request('/api/tasks?project=none')).json(),
    );
    expect(inbox.tasks).toHaveLength(0);
  });

  it('rejects a milestone that belongs to another project', async () => {
    const alpha = await createProject('Alpha');
    const beta = await createProject('Beta');
    const milestone = await createMilestone(alpha.id, 'Alpha phase');
    const task = await createTask({ title: 'Draft plan' });

    const { response } = await send('POST', `/api/tasks/${task.id}/move`, {
      projectId: beta.id,
      milestoneId: milestone.id,
    });
    expect(response.status).toBe(400);
  });

  it('moving back to the Inbox clears the milestone', async () => {
    const project = await createProject('Onboarding');
    const milestone = await createMilestone(project.id, 'Phase 1');
    const task = await createTask({
      title: 'Draft plan',
      projectId: project.id,
      milestoneId: milestone.id,
    });

    const moved = taskResponseSchema.parse(
      (await send('POST', `/api/tasks/${task.id}/move`, { projectId: null })).body,
    ).task;

    expect(moved).toMatchObject({ projectId: null, projectName: null, milestoneId: null });
  });

  it('returns 400 for an unknown project', async () => {
    const task = await createTask({ title: 'Draft plan' });
    const { response } = await send('POST', `/api/tasks/${task.id}/move`, {
      projectId: 'missing',
    });
    expect(response.status).toBe(400);
  });
});
