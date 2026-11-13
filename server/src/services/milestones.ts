import type { CreateMilestoneBody, Milestone, UpdateMilestoneBody } from '@app/shared';
import { asc, eq, sql } from 'drizzle-orm';
import { milestones, projects, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';

const milestoneSelection = {
  id: milestones.id,
  projectId: milestones.projectId,
  name: milestones.name,
  position: milestones.position,
  completedAt: milestones.completedAt,
  createdAt: milestones.createdAt,
};

type MilestoneRow = {
  id: string;
  projectId: string;
  name: string;
  position: number;
  completedAt: string | null;
  createdAt: string;
};

/** Task counts power the pill label "7 of 12" (DESIGN §4). */
function countsFor(db: Db, milestoneIds: string[]): Map<string, { done: number; total: number }> {
  const result = new Map<string, { done: number; total: number }>();
  if (milestoneIds.length === 0) return result;

  const rows = db
    .select({
      milestoneId: tasks.milestoneId,
      total: sql<number>`count(*)`,
      done: sql<number>`sum(case when ${tasks.completedAt} is not null then 1 else 0 end)`,
    })
    .from(tasks)
    .groupBy(tasks.milestoneId)
    .all();

  for (const row of rows) {
    if (row.milestoneId) {
      result.set(row.milestoneId, { done: Number(row.done ?? 0), total: Number(row.total) });
    }
  }

  return result;
}

function toMilestone(
  row: MilestoneRow,
  counts: { done: number; total: number } | undefined,
): Milestone {
  return { ...row, done: counts?.done ?? 0, total: counts?.total ?? 0 };
}

function requireMilestone(db: Db, id: string): MilestoneRow {
  const row: MilestoneRow | undefined = db
    .select(milestoneSelection)
    .from(milestones)
    .where(eq(milestones.id, id))
    .get();

  if (!row) throw new ServiceError('Milestone not found', 404);
  return row;
}

export function listMilestones(db: Db, projectId: string): Milestone[] {
  const project = db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) throw new ServiceError('Project not found', 404);

  const rows: MilestoneRow[] = db
    .select(milestoneSelection)
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.position), asc(milestones.createdAt))
    .all();

  const counts = countsFor(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => toMilestone(row, counts.get(row.id)));
}

export function getMilestone(db: Db, id: string): Milestone {
  const row = requireMilestone(db, id);
  return toMilestone(row, countsFor(db, [id]).get(id));
}

export function createMilestone(
  db: Db,
  projectId: string,
  body: CreateMilestoneBody,
): Milestone {
  const project = db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) throw new ServiceError('Project not found', 404);

  const positionRow = db
    .select({ value: sql<number>`coalesce(max(${milestones.position}), -1) + 1` })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .get();

  const inserted = db
    .insert(milestones)
    .values({
      projectId,
      name: body.name,
      position: body.position ?? Number(positionRow?.value ?? 0),
    })
    .returning({ id: milestones.id })
    .get();

  return getMilestone(db, inserted.id);
}

export function updateMilestone(db: Db, id: string, body: UpdateMilestoneBody): Milestone {
  requireMilestone(db, id);

  const patch: Partial<typeof milestones.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.position !== undefined) patch.position = body.position;
  if (body.completedAt !== undefined) patch.completedAt = body.completedAt;

  if (Object.keys(patch).length > 0) {
    db.update(milestones).set(patch).where(eq(milestones.id, id)).run();
  }

  return getMilestone(db, id);
}

/** Tasks stay in the project and drop to project level (PROGRESS D7). */
export function deleteMilestone(db: Db, id: string): void {
  const result = db.delete(milestones).where(eq(milestones.id, id)).run();
  if (result.changes === 0) throw new ServiceError('Milestone not found', 404);
}
