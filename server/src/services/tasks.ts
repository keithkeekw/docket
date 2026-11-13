import type { CreateTaskBody, Task, UpdateTaskBody } from '@app/shared';
import { and, asc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { milestones, projects, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';
import { defaultOpenStatusId, firstDoneStatusId, statusExists } from './statuses';

const taskSelection = {
  id: tasks.id,
  title: tasks.title,
  notes: tasks.notes,
  projectId: tasks.projectId,
  projectName: projects.name,
  milestoneId: tasks.milestoneId,
  statusId: tasks.statusId,
  statusName: statuses.name,
  statusCategory: statuses.category,
  priority: tasks.priority,
  dueDate: tasks.dueDate,
  dueTime: tasks.dueTime,
  estimateMinutes: tasks.estimateMinutes,
  recurrenceRule: tasks.recurrenceRule,
  completedAt: tasks.completedAt,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
};

type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  projectId: string | null;
  projectName: string | null;
  milestoneId: string | null;
  statusId: string;
  statusName: string;
  statusCategory: 'open' | 'active' | 'done';
  priority: number;
  dueDate: string | null;
  dueTime: string | null;
  estimateMinutes: number | null;
  recurrenceRule: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toTask(row: TaskRow): Task {
  return {
    ...row,
    priority: row.priority === 1 || row.priority === 2 ? row.priority : 3,
  };
}

export type TaskFilter = {
  /** `none` means Inbox (project_id IS NULL). */
  project?: 'none' | string;
  /** Inclusive local date bound, `YYYY-MM-DD`. */
  dueTo?: string;
  q?: string;
};

/**
 * List tasks for a collection. Ordering follows the List view: open tasks
 * first, then by due date (undated last), then by manual position (DESIGN §6:
 * done tasks sink to the bottom of their group).
 */
export function listTasks(db: Db, filter: TaskFilter = {}): Task[] {
  const conditions = [];

  if (filter.project === 'none') {
    conditions.push(isNull(tasks.projectId));
  } else if (filter.project) {
    conditions.push(eq(tasks.projectId, filter.project));
  }

  if (filter.dueTo) {
    conditions.push(sql`${tasks.dueDate} is not null and ${tasks.dueDate} <= ${filter.dueTo}`);
  }

  if (filter.q) {
    const term = `%${filter.q}%`;
    conditions.push(or(like(tasks.title, term), like(tasks.notes, term)));
  }

  const rows = db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(statuses, eq(tasks.statusId, statuses.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      sql`${tasks.completedAt} is not null`,
      sql`${tasks.dueDate} is null`,
      asc(tasks.dueDate),
      asc(tasks.position),
      asc(tasks.createdAt),
    )
    .all();

  return rows.map(toTask);
}

export function getTask(db: Db, id: string): Task {
  const row = db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(statuses, eq(tasks.statusId, statuses.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, id))
    .get();

  if (!row) throw new ServiceError('Task not found', 404);
  return toTask(row);
}

function nextPosition(db: Db, projectId: string | null): number {
  const row = db
    .select({ value: sql<number>`coalesce(max(${tasks.position}), -1) + 1` })
    .from(tasks)
    .where(projectId === null ? isNull(tasks.projectId) : eq(tasks.projectId, projectId))
    .get();

  return Number(row?.value ?? 0);
}

function assertProjectExists(db: Db, projectId: string | null): void {
  if (projectId === null) return;

  const row = db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!row) throw new ServiceError('Project not found', 400);
}

/**
 * TECHSTACK §4: a milestone must belong to the task's project. This is a
 * service rule, not a DB CHECK (PROGRESS D20).
 */
function assertMilestoneFitsProject(
  db: Db,
  milestoneId: string | null,
  projectId: string | null,
): void {
  if (milestoneId === null) return;

  const row = db
    .select({ projectId: milestones.projectId })
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .get();

  if (!row) throw new ServiceError('Milestone not found', 400);
  if (projectId === null) {
    throw new ServiceError('A task with a milestone must belong to its project', 400);
  }
  if (row.projectId !== projectId) {
    throw new ServiceError('Milestone belongs to a different project', 400);
  }
}

export function createTask(db: Db, body: CreateTaskBody): Task {
  const statusId = body.statusId ?? defaultOpenStatusId(db);
  if (!statusId) throw new ServiceError('No statuses configured', 500);
  if (!statusExists(db, statusId)) throw new ServiceError('Status not found', 400);

  const projectId = body.projectId ?? null;
  const milestoneId = body.milestoneId ?? null;

  assertProjectExists(db, projectId);
  assertMilestoneFitsProject(db, milestoneId, projectId);

  const inserted = db
    .insert(tasks)
    .values({
      title: body.title,
      notes: body.notes ?? null,
      projectId,
      milestoneId,
      statusId,
      priority: body.priority ?? 3,
      dueDate: body.dueDate ?? null,
      dueTime: body.dueTime ?? null,
      estimateMinutes: body.estimateMinutes ?? null,
      position: nextPosition(db, projectId),
    })
    .returning({ id: tasks.id })
    .get();

  return getTask(db, inserted.id);
}

export function updateTask(db: Db, id: string, body: UpdateTaskBody): Task {
  const existing = getTask(db, id);

  if (body.statusId !== undefined && !statusExists(db, body.statusId)) {
    throw new ServiceError('Status not found', 400);
  }

  const projectId = body.projectId !== undefined ? body.projectId : existing.projectId;
  const milestoneId =
    body.milestoneId !== undefined
      ? body.milestoneId
      : body.projectId === null
        ? null
        : existing.milestoneId;

  assertProjectExists(db, projectId);
  assertMilestoneFitsProject(db, milestoneId, projectId);

  const patch: Partial<typeof tasks.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.title !== undefined) patch.title = body.title;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.statusId !== undefined) patch.statusId = body.statusId;
  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
  if (body.dueTime !== undefined) patch.dueTime = body.dueTime;
  if (body.estimateMinutes !== undefined) patch.estimateMinutes = body.estimateMinutes;
  if (body.projectId !== undefined) patch.projectId = body.projectId;
  if (body.milestoneId !== undefined) patch.milestoneId = body.milestoneId;

  // Moving a task out of a project drops its milestone with it (PROGRESS D7).
  if (body.projectId === null && body.milestoneId === undefined) {
    patch.milestoneId = null;
  }

  db.update(tasks).set(patch).where(eq(tasks.id, id)).run();

  return getTask(db, id);
}

/**
 * `POST /api/tasks/:id/complete`. Completion sets the first `done` status and
 * stamps `completed_at`; unticking returns the task to "To do" (D6). Recurrence
 * (FR-15) is added in M1-S8 on top of this entry point.
 */
export function setTaskDone(db: Db, id: string, done: boolean): Task {
  const existing = getTask(db, id);

  const statusId = done ? firstDoneStatusId(db) : defaultOpenStatusId(db);
  if (!statusId) throw new ServiceError('No statuses configured', 500);

  db.update(tasks)
    .set({
      statusId,
      completedAt: done ? (existing.completedAt ?? new Date().toISOString()) : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tasks.id, id))
    .run();

  return getTask(db, id);
}

export function deleteTask(db: Db, id: string): void {
  const result = db.delete(tasks).where(eq(tasks.id, id)).run();
  if (result.changes === 0) throw new ServiceError('Task not found', 404);
}
