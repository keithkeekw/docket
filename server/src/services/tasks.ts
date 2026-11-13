import type {
  ChecklistItem,
  CreateTaskBody,
  MoveTaskBody,
  Task,
  TaskDetail,
  TaskLink,
  UpdateTaskBody,
} from '@app/shared';
import { and, asc, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm';
import {
  checklistItems,
  milestones,
  projects,
  statuses,
  tags,
  taskLinks,
  taskTags,
  tasks,
} from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';
import { listAttachments } from './attachments';
import { createNextOccurrence } from './recurrence';
import { undoableTaskBulkDelete, undoableTaskDelete } from './undo';
import { defaultOpenStatusId, firstDoneStatusId, statusCategoryOf, statusExists } from './statuses';

const taskSelection = {
  id: tasks.id,
  title: tasks.title,
  notes: tasks.notes,
  projectId: tasks.projectId,
  projectName: projects.name,
  milestoneId: tasks.milestoneId,
  milestoneName: milestones.name,
  statusId: tasks.statusId,
  statusName: statuses.name,
  statusCategory: statuses.category,
  priority: tasks.priority,
  dueDate: tasks.dueDate,
  dueTime: tasks.dueTime,
  estimateMinutes: tasks.estimateMinutes,
  recurrenceRule: tasks.recurrenceRule,
  recurrenceParentId: tasks.recurrenceParentId,
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
  milestoneName: string | null;
  statusId: string;
  statusName: string;
  statusCategory: 'open' | 'active' | 'done';
  priority: number;
  dueDate: string | null;
  dueTime: string | null;
  estimateMinutes: number | null;
  recurrenceRule: string | null;
  recurrenceParentId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskExtras = {
  tags: string[];
  link: TaskLink | null;
  checklist: { done: number; total: number };
};

const EMPTY_EXTRAS: TaskExtras = { tags: [], link: null, checklist: { done: 0, total: 0 } };

function toTask(row: TaskRow, extras: TaskExtras = EMPTY_EXTRAS): Task {
  return {
    ...row,
    priority: row.priority === 1 || row.priority === 2 ? row.priority : 3,
    tags: extras.tags,
    link: extras.link,
    checklist: extras.checklist,
  };
}

/**
 * Tags, first link and checklist counts for a set of tasks, in three queries
 * rather than three per row (NFR-4).
 */
function summariesFor(db: Db, taskIds: string[]): Map<string, TaskExtras> {
  const result = new Map<string, TaskExtras>();
  if (taskIds.length === 0) return result;

  for (const id of taskIds) {
    result.set(id, { tags: [], link: null, checklist: { done: 0, total: 0 } });
  }

  const tagRows = db
    .select({ taskId: taskTags.taskId, name: tags.name })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, taskIds))
    .orderBy(asc(tags.name))
    .all();

  for (const row of tagRows) result.get(row.taskId)?.tags.push(row.name);

  const linkRows = db
    .select({
      id: taskLinks.id,
      taskId: taskLinks.taskId,
      url: taskLinks.url,
      label: taskLinks.label,
    })
    .from(taskLinks)
    .where(inArray(taskLinks.taskId, taskIds))
    .orderBy(asc(taskLinks.id))
    .all();

  // The row badge shows one link; the drawer shows them all.
  for (const row of linkRows) {
    const extras = result.get(row.taskId);
    if (extras && extras.link === null) extras.link = row;
  }

  const countRows = db
    .select({
      taskId: checklistItems.taskId,
      total: sql<number>`count(*)`,
      done: sql<number>`sum(case when ${checklistItems.done} then 1 else 0 end)`,
    })
    .from(checklistItems)
    .where(inArray(checklistItems.taskId, taskIds))
    .groupBy(checklistItems.taskId)
    .all();

  for (const row of countRows) {
    const extras = result.get(row.taskId);
    if (extras) extras.checklist = { done: Number(row.done ?? 0), total: Number(row.total) };
  }

  return result;
}

function withSummaries(db: Db, rows: TaskRow[]): Task[] {
  const summaries = summariesFor(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => toTask(row, summaries.get(row.id) ?? EMPTY_EXTRAS));
}

export type TaskFilter = {
  /** `none` means Inbox (project_id IS NULL). */
  project?: 'none' | string;
  /** Any of these statuses (FR-11). */
  statusIds?: string[];
  /** Any of 1, 2, 3 (FR-11). */
  priorities?: number[];
  /** Inclusive local date bounds, `YYYY-MM-DD`. */
  dueFrom?: string;
  dueTo?: string;
  /** Exclusive upper bound — `< today` is the dashboard's Overdue group. */
  dueBefore?: string;
  /** Open work only (status category ≠ done), for dashboard groups. */
  openOnly?: boolean;
  q?: string;
  /** Exact tag name (FR-30). */
  tag?: string;
  /**
   * Open work by default. `only` powers the Logbook; `all` is available for
   * export-style callers that need both halves.
   */
  completed?: 'exclude' | 'only' | 'all';
  /**
   * `manual` follows the drag order (default for task lists); `due` keeps the
   * dashboard's date-first ordering.
   */
  order?: 'manual' | 'due';
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

  if (filter.statusIds && filter.statusIds.length > 0) {
    conditions.push(inArray(tasks.statusId, filter.statusIds));
  }

  if (filter.priorities && filter.priorities.length > 0) {
    conditions.push(inArray(tasks.priority, filter.priorities));
  }

  if (filter.dueFrom) {
    conditions.push(sql`${tasks.dueDate} is not null and ${tasks.dueDate} >= ${filter.dueFrom}`);
  }

  if (filter.dueTo) {
    conditions.push(sql`${tasks.dueDate} is not null and ${tasks.dueDate} <= ${filter.dueTo}`);
  }

  if (filter.dueBefore) {
    conditions.push(sql`${tasks.dueDate} is not null and ${tasks.dueDate} < ${filter.dueBefore}`);
  }

  if (filter.openOnly) {
    conditions.push(sql`${statuses.category} <> 'done'`);
  }

  if (filter.completed === 'only') {
    conditions.push(sql`${tasks.completedAt} is not null`);
  } else if (filter.completed !== 'all') {
    conditions.push(sql`${tasks.completedAt} is null`);
  }

  if (filter.q) {
    const term = `%${filter.q}%`;
    conditions.push(or(like(tasks.title, term), like(tasks.notes, term)));
  }

  if (filter.tag) {
    conditions.push(
      sql`exists (
        select 1 from ${taskTags}
        inner join ${tags} on ${tags.id} = ${taskTags.tagId}
        where ${taskTags.taskId} = ${tasks.id} and ${tags.name} = ${filter.tag}
      )`,
    );
  }

  const order = filter.order ?? 'manual';

  const rows = db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(statuses, eq(tasks.statusId, statuses.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      ...(filter.completed === 'only'
        ? [desc(tasks.completedAt), asc(tasks.position)]
        : [
            sql`${tasks.completedAt} is not null`,
            ...(order === 'due'
              ? [
                  sql`${tasks.dueDate} is null`,
                  asc(tasks.dueDate),
                  asc(tasks.dueTime),
                  asc(tasks.position),
                  asc(tasks.createdAt),
                ]
              : [asc(tasks.position), asc(tasks.createdAt)]),
          ]),
    )
    .all();

  return withSummaries(db, rows);
}

export function getTask(db: Db, id: string): Task {
  const row = db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(statuses, eq(tasks.statusId, statuses.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
    .where(eq(tasks.id, id))
    .get();

  if (!row) throw new ServiceError('Task not found', 404);

  const [task] = withSummaries(db, [row]);
  if (!task) throw new ServiceError('Task not found', 404);
  return task;
}

/** `GET /api/tasks/:id` — the drawer's view: links and checklist included. */
export function getTaskDetail(db: Db, id: string): TaskDetail {
  const task = getTask(db, id);

  const links = db
    .select({
      id: taskLinks.id,
      taskId: taskLinks.taskId,
      url: taskLinks.url,
      label: taskLinks.label,
    })
    .from(taskLinks)
    .where(eq(taskLinks.taskId, id))
    .orderBy(asc(taskLinks.id))
    .all();

  const checklist = db
    .select({
      id: checklistItems.id,
      taskId: checklistItems.taskId,
      title: checklistItems.title,
      done: checklistItems.done,
      position: checklistItems.position,
    })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, id))
    .orderBy(asc(checklistItems.position), asc(checklistItems.id))
    .all();

  return {
    ...task,
    links,
    checklistItems: checklist.map((item): ChecklistItem => ({ ...item, done: Boolean(item.done) })),
    attachments: listAttachments(db, id),
  };
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
      recurrenceRule: body.recurrenceRule ?? null,
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

  if (body.statusId !== undefined) {
    patch.statusId = body.statusId;

    // Completion is a property of the status category, so picking "Done" in the
    // drawer or dragging a Kanban card there stamps `completed_at` too, and
    // picking an open status clears it (PROGRESS D6/D8).
    if (statusCategoryOf(db, body.statusId) === 'done') {
      patch.completedAt = existing.completedAt ?? new Date().toISOString();
    } else {
      patch.completedAt = null;
    }
  }

  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
  if (body.dueTime !== undefined) patch.dueTime = body.dueTime;
  if (body.estimateMinutes !== undefined) patch.estimateMinutes = body.estimateMinutes;
  if (body.recurrenceRule !== undefined) patch.recurrenceRule = body.recurrenceRule;
  if (body.projectId !== undefined) patch.projectId = body.projectId;
  if (body.milestoneId !== undefined) patch.milestoneId = body.milestoneId;

  // Moving a task out of a project drops its milestone with it (PROGRESS D7).
  if (body.projectId === null && body.milestoneId === undefined) {
    patch.milestoneId = null;
  }

  // A task that changes collection joins the end of the new one.
  if (body.projectId !== undefined && body.projectId !== existing.projectId) {
    patch.position = nextPosition(db, body.projectId);
  }

  db.update(tasks).set(patch).where(eq(tasks.id, id)).run();

  const updated = getTask(db, id);
  const becameDone = existing.completedAt === null && updated.completedAt !== null;

  // Completion is completion whichever path reached it (D34), so the next
  // recurrence is created here too, not only from /complete (FR-15).
  if (becameDone && updated.recurrenceRule) createNextOccurrence(db, updated.id);

  return updated;
}

/**
 * `POST /api/tasks/:id/move` (FR-5, US-3). Inbox, a project or a milestone —
 * the milestone must belong to the target project (D20).
 */
export function moveTask(db: Db, id: string, body: MoveTaskBody): Task {
  const existing = getTask(db, id);

  const projectId = body.projectId;
  const milestoneId = body.milestoneId ?? null;

  assertProjectExists(db, projectId);
  assertMilestoneFitsProject(db, milestoneId, projectId);

  const patch: Partial<typeof tasks.$inferInsert> = {
    projectId,
    milestoneId,
    updatedAt: new Date().toISOString(),
  };

  if (projectId !== existing.projectId) {
    patch.position = nextPosition(db, projectId);
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

  const updated = getTask(db, id);

  // FR-15: the next occurrence is created when the task first becomes done.
  if (done && existing.completedAt === null && updated.recurrenceRule) {
    createNextOccurrence(db, updated.id);
  }

  return updated;
}

export function deleteTask(db: Db, id: string): void {
  undoableTaskDelete(db, id);
  const result = db.delete(tasks).where(eq(tasks.id, id)).run();
  if (result.changes === 0) throw new ServiceError('Task not found', 404);
}

/**
 * `POST /api/tasks/reorder` — the List view's drag order. Positions become
 * 0..n-1 in the order given; the ids must all exist and be unique.
 */
export function reorderTasks(db: Db, ids: string[]): number {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new ServiceError('A task appears more than once in the new order', 400);
  }

  const existing = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(inArray(tasks.id, ids))
    .all();

  if (existing.length !== ids.length) throw new ServiceError('Task not found', 404);

  db.transaction((tx) => {
    ids.forEach((id, position) => {
      tx.update(tasks).set({ position }).where(eq(tasks.id, id)).run();
    });
  });

  return ids.length;
}

/** `POST /api/tasks/bulk-delete` — one transaction, one undo entry (FR-29). */
export function deleteTasks(db: Db, ids: string[]): number {
  const unique = [...new Set(ids)];
  const existing = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(inArray(tasks.id, unique))
    .all();

  if (existing.length === 0) return 0;

  const existingIds = existing.map((row) => row.id);
  undoableTaskBulkDelete(db, existingIds);

  const result = db.delete(tasks).where(inArray(tasks.id, existingIds)).run();
  return result.changes;
}
