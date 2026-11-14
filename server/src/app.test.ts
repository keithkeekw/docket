import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { navSummarySchema } from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { projects, statuses, tasks } from './db/schema';
import type { Db } from './db/types';
import { localDateString } from './lib/dates';
import { createTestDb } from './test/helpers';

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

describe('GET /api/health', () => {
  it('reports the database and the seeded status count', async () => {
    const response = await app.request('/api/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      database: { ready: true, statuses: 5 },
    });
  });
});

describe('serving the built frontend', () => {
  let staticDir: string;

  beforeEach(() => {
    staticDir = mkdtempSync(path.join(tmpdir(), 'docket-static-'));
    writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>Docket</title>');
    app = createApp(db, { staticDir });
  });

  afterEach(() => {
    rmSync(staticDir, { recursive: true, force: true });
  });

  it('falls back to index.html for app routes', async () => {
    const response = await app.request('/projects/abc');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  it('keeps unknown API paths as JSON 404s instead of the app page', async () => {
    const response = await app.request('/api/not-a-route');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Not found' });
  });
});

describe('GET /api/nav', () => {
  it('returns empty counts and no projects on a fresh database', async () => {
    const response = await app.request('/api/nav');

    expect(response.status).toBe(200);
    expect(navSummarySchema.parse(await response.json())).toEqual({
      counts: { inbox: 0, today: 0, all: 0 },
      projects: [],
    });
  });

  it('counts open work only, with Today covering overdue and due today', async () => {
    const today = localDateString();
    const yesterday = localDateString(new Date(Date.now() - 86_400_000));
    const open = statusIdByName('To do');
    const done = statusIdByName('Done');

    db.insert(tasks)
      .values([
        { title: 'Inbox, due today', statusId: open, dueDate: today },
        { title: 'Inbox, overdue', statusId: open, dueDate: yesterday },
        { title: 'No due date', statusId: open },
        { title: 'Already finished', statusId: done, dueDate: today },
      ])
      .run();

    const body = navSummarySchema.parse(await (await app.request('/api/nav')).json());

    expect(body.counts).toEqual({ inbox: 3, today: 2, all: 3 });
  });

  it('lists active projects in position order and hides archived ones', async () => {
    db.insert(projects)
      .values([
        { name: 'Second', position: 2 },
        { name: 'Archived', position: 1, archived: true },
        { name: 'First', position: 0 },
      ])
      .run();

    const body = navSummarySchema.parse(await (await app.request('/api/nav')).json());

    expect(body.projects.map((project) => project.name)).toEqual(['First', 'Second']);
  });
});
