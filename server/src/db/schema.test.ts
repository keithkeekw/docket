import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as schema from './schema';
import {
  appSettings,
  checklistItems,
  milestones,
  projects,
  statuses,
  tags,
  taskLinks,
  taskTags,
  tasks,
} from './schema';
import { seedAppSettings, seedStatuses } from './seed-data';
import type { Db } from './types';

const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url));

let sqlite: Database.Database;
let db: Db;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
});

afterEach(() => {
  sqlite.close();
});

function statusIdByName(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`Status "${name}" is not seeded`);
  return row.id;
}

describe('migrations and seed', () => {
  it('applies every migration to an empty database', () => {
    const tables = sqlite
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toEqual(
      expect.arrayContaining([
        'ai_settings',
        'app_settings',
        'checklist_items',
        'milestones',
        'projects',
        'proposals',
        'reviews',
        'statuses',
        'tags',
        'task_links',
        'task_tags',
        'tasks',
      ]),
    );
  });

  it('seeds the five statuses in their configured order and categories', () => {
    expect(seedStatuses(db)).toBe(5);

    const rows = db.select().from(statuses).orderBy(statuses.position).all();

    expect(rows.map((row) => [row.name, row.category, row.position])).toEqual([
      ['Backlog', 'open', 0],
      ['To do', 'open', 1],
      ['In progress', 'active', 2],
      ['Waiting', 'active', 3],
      ['Done', 'done', 4],
    ]);
  });

  it('is idempotent: re-seeding adds nothing', () => {
    seedStatuses(db);
    expect(seedStatuses(db)).toBe(0);
    expect(db.select({ count: sql<number>`count(*)` }).from(statuses).get()?.count).toBe(5);
  });

  it('seeds app settings once and never overwrites a changed value', () => {
    expect(seedAppSettings(db)).toBe(3);

    db.update(appSettings)
      .set({ value: '08:15' })
      .where(eq(appSettings.key, 'daily_review_time'))
      .run();

    expect(seedAppSettings(db)).toBe(0);

    const row = db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'daily_review_time'))
      .get();
    expect(row?.value).toBe('08:15');
  });
});

describe('schema constraints', () => {
  beforeEach(() => {
    seedStatuses(db);
  });

  it('deleting a project moves its tasks to the Inbox and clears the milestone', () => {
    const project = db.insert(projects).values({ name: 'Onboarding' }).returning().get();
    const milestone = db
      .insert(milestones)
      .values({ projectId: project.id, name: 'Phase 1' })
      .returning()
      .get();
    const task = db
      .insert(tasks)
      .values({
        title: 'Draft plan',
        projectId: project.id,
        milestoneId: milestone.id,
        statusId: statusIdByName('To do'),
      })
      .returning()
      .get();

    db.delete(projects).where(eq(projects.id, project.id)).run();

    const after = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(after?.projectId).toBeNull();
    expect(after?.milestoneId).toBeNull();
  });

  it('refuses to delete a status that is still in use (US-10)', () => {
    const statusId = statusIdByName('To do');
    db.insert(tasks).values({ title: 'In use', statusId }).run();

    expect(() => db.delete(statuses).where(eq(statuses.id, statusId)).run()).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it('cascades checklist items, links and tag links when a task is deleted', () => {
    const statusId = statusIdByName('To do');
    const tag = db.insert(tags).values({ name: 'ops' }).returning().get();
    const task = db.insert(tasks).values({ title: 'Parent', statusId }).returning().get();

    db.insert(checklistItems).values({ taskId: task.id, title: 'Step 1' }).run();
    db.insert(taskLinks).values({ taskId: task.id, url: 'https://example.test/ZD-1', label: 'ZD-1' }).run();
    db.insert(taskTags).values({ taskId: task.id, tagId: tag.id }).run();

    db.delete(tasks).where(eq(tasks.id, task.id)).run();

    expect(db.select().from(checklistItems).all()).toHaveLength(0);
    expect(db.select().from(taskLinks).all()).toHaveLength(0);
    expect(db.select().from(taskTags).all()).toHaveLength(0);
    expect(db.select().from(tags).all()).toHaveLength(1);
  });

  it('rejects an out-of-range priority', () => {
    expect(() =>
      db
        .insert(tasks)
        .values({ title: 'Bad priority', statusId: statusIdByName('To do'), priority: 4 })
        .run(),
    ).toThrow(/CHECK/i);
  });

  it('keeps tag names unique', () => {
    db.insert(tags).values({ name: 'ops' }).run();
    expect(() => db.insert(tags).values({ name: 'ops' }).run()).toThrow(/UNIQUE/i);
  });
});
