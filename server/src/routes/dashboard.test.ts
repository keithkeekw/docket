import { dashboardSchema } from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { projects, reviews, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { localDateString } from '../lib/dates';
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

async function dashboard() {
  const response = await app.request('/api/dashboard');
  expect(response.status).toBe(200);
  return dashboardSchema.parse(await response.json());
}

const today = localDateString();
const yesterday = localDateString(new Date(Date.now() - 86_400_000));
const tomorrow = localDateString(new Date(Date.now() + 86_400_000));

describe('GET /api/dashboard', () => {
  it('returns an empty, dated dashboard on a fresh database', async () => {
    const body = await dashboard();

    expect(body).toEqual({
      date: today,
      counts: { overdue: 0, today: 0, inbox: 0 },
      groups: { overdue: [], today: [], inbox: [] },
      activeProjects: [],
      latestReview: null,
    });
  });

  it('partitions open work into overdue, today and the unsorted Inbox', async () => {
    const open = statusIdByName('To do');
    const done = statusIdByName('Done');

    db.insert(tasks)
      .values([
        { title: 'Overdue', statusId: open, dueDate: yesterday },
        { title: 'Today', statusId: open, dueDate: today },
        { title: 'Undated inbox', statusId: open },
        { title: 'Future inbox', statusId: open, dueDate: tomorrow },
        { title: 'Finished overdue', statusId: done, dueDate: yesterday, completedAt: '2026-11-01T00:00:00.000Z' },
      ])
      .run();

    const body = await dashboard();

    // The Inbox count matches the sidebar: every open task with no project,
    // including the ones already shown under Overdue and Today.
    expect(body.counts).toEqual({ overdue: 1, today: 1, inbox: 4 });
    expect(body.groups.overdue.map((task) => task.title)).toEqual(['Overdue']);
    expect(body.groups.today.map((task) => task.title)).toEqual(['Today']);
    expect(body.groups.inbox.map((task) => task.title)).toEqual(['Future inbox', 'Undated inbox']);
  });

  it('includes project work in the due groups but not the Inbox group', async () => {
    const project = db.insert(projects).values({ name: 'Onboarding' }).returning().get();
    const open = statusIdByName('To do');

    db.insert(tasks)
      .values([
        { title: 'Project today', statusId: open, projectId: project.id, dueDate: today },
        { title: 'Project overdue', statusId: open, projectId: project.id, dueDate: yesterday },
      ])
      .run();

    const body = await dashboard();

    expect(body.groups.today.map((task) => task.title)).toEqual(['Project today']);
    expect(body.groups.overdue.map((task) => task.title)).toEqual(['Project overdue']);
    expect(body.groups.inbox).toHaveLength(0);
    expect(body.counts.inbox).toBe(0);
  });

  it('caps each group while keeping the counts exact', async () => {
    const open = statusIdByName('To do');

    for (let index = 0; index < 8; index += 1) {
      db.insert(tasks)
        .values({ title: `Overdue ${index}`, statusId: open, dueDate: '2026-01-01' })
        .run();
    }

    const body = await dashboard();

    expect(body.counts.overdue).toBe(8);
    expect(body.groups.overdue).toHaveLength(6);
  });

  it('lists active projects with progress and hides archived ones', async () => {
    const active = db.insert(projects).values({ name: 'Active' }).returning().get();
    db.insert(projects).values({ name: 'Archived', archived: true }).run();

    const open = statusIdByName('To do');
    const done = statusIdByName('Done');
    db.insert(tasks)
      .values([
        { title: 'One', statusId: open, projectId: active.id },
        { title: 'Two', statusId: done, projectId: active.id, completedAt: '2026-11-01T00:00:00.000Z' },
      ])
      .run();

    const body = await dashboard();

    expect(body.activeProjects.map((project) => project.name)).toEqual(['Active']);
    expect(body.activeProjects[0]?.progress).toMatchObject({ done: 1, total: 2, percent: 50 });
  });

  it('returns the latest review when one exists', async () => {
    db.insert(reviews)
      .values([
        {
          kind: 'daily',
          periodStart: yesterday,
          periodEnd: yesterday,
          contentMd: 'Older',
          model: 'deepseek-chat',
          createdAt: '2026-11-12T07:30:00.000Z',
        },
        {
          kind: 'daily',
          periodStart: today,
          periodEnd: today,
          contentMd: 'Newest',
          model: 'deepseek-chat',
          createdAt: '2026-11-13T07:30:00.000Z',
        },
      ])
      .run();

    const body = await dashboard();
    expect(body.latestReview).toMatchObject({ contentMd: 'Newest', kind: 'daily' });
  });
});
