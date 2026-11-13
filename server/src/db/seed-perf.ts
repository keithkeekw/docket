import { sql } from 'drizzle-orm';
import { db, sqlite } from './client';
import { env } from '../env';
import {
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

/**
 * NFR-4 fixture: 50 projects and 5,000 tasks. Opt-in and refused on the real
 * database (PROGRESS D18), because it writes invented work.
 *
 *   DATABASE_PATH=./data/perf.db npm run db:seed:perf
 */
const PROJECT_COUNT = 50;
const TASK_COUNT = 5_000;
const MILESTONES_PER_PROJECT = 3;

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = mulberry32(20261113);
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

function dateAround(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor((random() - 0.5) * 2 * days));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

if (env.databasePath.endsWith('/data/app.db')) {
  console.error(
    'Refusing to seed performance data into data/app.db. Use a throwaway file:\n' +
      '  DATABASE_PATH=./data/perf.db npm run db:seed:perf',
  );
  process.exit(1);
}

const started = Date.now();

try {
  seedStatuses(db);
  seedAppSettings(db);

  const statusRows = db.select().from(statuses).all();
  const openStatuses = statusRows.filter((status) => status.category !== 'done');
  const doneStatus = statusRows.find((status) => status.category === 'done') ?? statusRows[0];

  if (!doneStatus || openStatuses.length === 0) throw new Error('statuses are not seeded');

  const tagIds = Array.from(
    { length: 20 },
    (_, index) =>
      db
        .insert(tags)
        .values({ name: `tag-${index + 1}` })
        .returning({ id: tags.id })
        .get().id,
  );

  db.transaction(() => {
    const projectMilestones: Array<{ projectId: string; milestoneIds: string[] }> = [];

    for (let index = 0; index < PROJECT_COUNT; index += 1) {
      const project = db
        .insert(projects)
        .values({
          name: `Project ${index + 1}`,
          description: `Performance fixture project ${index + 1}.`,
          position: index,
          aiExcluded: index % 10 === 0,
        })
        .returning({ id: projects.id })
        .get();

      const milestoneIds = Array.from(
        { length: MILESTONES_PER_PROJECT },
        (_, phase) =>
          db
            .insert(milestones)
            .values({
              projectId: project.id,
              name: `Phase ${phase + 1}`,
              position: phase,
              completedAt: phase === 0 && index % 3 === 0 ? new Date().toISOString() : null,
            })
            .returning({ id: milestones.id })
            .get().id,
      );

      projectMilestones.push({ projectId: project.id, milestoneIds });
    }

    const batch: Array<typeof tasks.$inferInsert> = [];

    for (let index = 0; index < TASK_COUNT; index += 1) {
      const inProject = random() < 0.8;
      const owner = inProject ? pick(projectMilestones) : null;
      const done = random() < 0.4;

      batch.push({
        title: `Task ${index + 1}: ${pick(['draft', 'review', 'send', 'book', 'plan'])} ${pick([
          'the vendor note',
          'the welcome doc',
          'the venue',
          'the quarterly review',
          'the security form',
        ])}`,
        notes: random() < 0.2 ? `Fixture notes for task ${index + 1}.` : null,
        projectId: owner?.projectId ?? null,
        milestoneId: owner && random() < 0.6 ? pick(owner.milestoneIds) : null,
        statusId: done ? doneStatus.id : pick(openStatuses).id,
        priority: pick([1, 2, 3] as const),
        dueDate: random() < 0.75 ? dateAround(30) : null,
        dueTime: random() < 0.15 ? '10:00' : null,
        estimateMinutes: random() < 0.4 ? pick([15, 30, 45, 60, 90]) : null,
        recurrenceRule: random() < 0.03 ? 'FREQ=WEEKLY' : null,
        position: index,
        completedAt: done
          ? new Date(Date.now() - Math.floor(random() * 20) * 86_400_000).toISOString()
          : null,
      });
    }

    for (let offset = 0; offset < batch.length; offset += 250) {
      const inserted = db
        .insert(tasks)
        .values(batch.slice(offset, offset + 250))
        .returning({ id: tasks.id })
        .all();

      for (const task of inserted) {
        if (random() < 0.3) {
          db.insert(taskTags)
            .values({ taskId: task.id, tagId: pick(tagIds) })
            .onConflictDoNothing()
            .run();
        }
        if (random() < 0.1) {
          db.insert(taskLinks)
            .values({ taskId: task.id, url: 'https://example.com/browse/OPS-1', label: 'OPS-1' })
            .run();
        }
        if (random() < 0.1) {
          db.insert(checklistItems)
            .values({ taskId: task.id, title: 'First step', position: 0 })
            .run();
        }
      }
    }
  });

  const taskCount = db
    .select({ value: sql<number>`count(*)` })
    .from(tasks)
    .get();
  const projectCount = db
    .select({ value: sql<number>`count(*)` })
    .from(projects)
    .get();
  const milestoneCount = db
    .select({ value: sql<number>`count(*)` })
    .from(milestones)
    .get();

  console.log(
    `Seeded ${Number(taskCount?.value ?? 0)} tasks, ${Number(projectCount?.value ?? 0)} projects and ${Number(
      milestoneCount?.value ?? 0,
    )} milestones in ${Date.now() - started} ms → ${env.databasePath}`,
  );
} catch (error) {
  console.error('Perf seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  sqlite.close();
}
