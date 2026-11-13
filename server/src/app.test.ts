import { fileURLToPath } from 'node:url';
import { navSummarySchema } from '@app/shared';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import * as schema from './db/schema';
import { projects, statuses, tasks } from './db/schema';
import { seedAppSettings, seedStatuses } from './db/seed-data';
import type { Db } from './db/types';
import { localDateString } from './lib/dates';

const migrationsFolder = fileURLToPath(new URL('./db/migrations', import.meta.url));

let sqlite: Database.Database;
let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  seedStatuses(db);
  seedAppSettings(db);
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
