import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { projects, statuses } from '../db/schema';
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

async function seed() {
  const project = db.insert(projects).values({ name: 'Onboarding' }).returning().get();
  const open = db
    .select({ id: statuses.id })
    .from(statuses)
    .where(eq(statuses.name, 'Backlog'))
    .get();

  const created = await app.request('/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Draft the welcome doc',
      projectId: project.id,
      statusId: open?.id,
      priority: 2,
      dueDate: '2026-11-20',
      notes: 'Cover the first week.',
    }),
  });
  return ((await created.json()) as any).task.id as string;
}

describe('GET /api/export?format=json', () => {
  it('returns the whole database with tags, links and checklist nested under tasks', async () => {
    const taskId = await seed();
    await app.request(`/api/tasks/${taskId}/tags`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tags: ['docs'] }),
    });

    const response = await app.request('/api/export?format=json');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('content-disposition')).toContain('attachment');

    const body = (await response.json()) as any;
    expect(body.version).toBe(1);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0]).toMatchObject({ title: 'Draft the welcome doc', tags: ['docs'] });
    expect(body.projects).toHaveLength(1);
    expect(body.statuses).toHaveLength(5);
    expect(JSON.stringify(body)).not.toContain('sk-');
  });
});

describe('GET /api/export?format=markdown', () => {
  it('renders projects, tasks and statuses as Markdown', async () => {
    await seed();

    const response = await app.request('/api/export?format=markdown');
    const text = await response.text();

    expect(response.headers.get('content-type')).toContain('text/markdown');
    expect(text).toContain('# Export —');
    expect(text).toContain('## Onboarding — 0 of 1 done');
    expect(text).toContain(
      '- [ ] Draft the welcome doc (P2, Backlog, Onboarding) — due 2026-11-20',
    );
    expect(text).toContain('## Statuses');
  });
});
