import type {
  CreateProjectBody,
  ProjectProgress,
  ProjectSummary,
  UpdateProjectBody,
} from '@app/shared';
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { milestones, projects, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';
import { undoableProjectDelete } from './undo';

const projectSelection = {
  id: projects.id,
  name: projects.name,
  description: projects.description,
  targetDate: projects.targetDate,
  archived: projects.archived,
  aiExcluded: projects.aiExcluded,
  position: projects.position,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
};

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  targetDate: string | null;
  archived: boolean;
  aiExcluded: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

function emptyProgress(): ProjectProgress {
  return { done: 0, total: 0, percent: 0, currentMilestone: null, nextDueTask: null };
}

/**
 * Project progress is derived, never stored (PROGRESS D8): done ÷ all tasks,
 * the lowest-position incomplete milestone, and the earliest due date still
 * open. Three grouped queries cover the whole project list (NFR-4).
 */
function progressFor(db: Db, projectIds: string[]): Map<string, ProjectProgress> {
  const result = new Map<string, ProjectProgress>();
  for (const id of projectIds) result.set(id, emptyProgress());
  if (projectIds.length === 0) return result;

  const counts = db
    .select({
      projectId: tasks.projectId,
      total: sql<number>`count(*)`,
      done: sql<number>`sum(case when ${tasks.completedAt} is not null then 1 else 0 end)`,
    })
    .from(tasks)
    .where(isNotNull(tasks.projectId))
    .groupBy(tasks.projectId)
    .all();

  for (const row of counts) {
    const progress = row.projectId ? result.get(row.projectId) : undefined;
    if (!progress) continue;

    progress.total = Number(row.total);
    progress.done = Number(row.done ?? 0);
    progress.percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
  }

  const openMilestones = db
    .select({ id: milestones.id, projectId: milestones.projectId, name: milestones.name })
    .from(milestones)
    .where(isNull(milestones.completedAt))
    .orderBy(asc(milestones.projectId), asc(milestones.position), asc(milestones.createdAt))
    .all();

  for (const milestone of openMilestones) {
    const progress = result.get(milestone.projectId);
    if (progress && progress.currentMilestone === null) {
      progress.currentMilestone = { id: milestone.id, name: milestone.name };
    }
  }

  const nextDue = db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      title: tasks.title,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(and(isNotNull(tasks.projectId), isNotNull(tasks.dueDate), isNull(tasks.completedAt)))
    .orderBy(asc(tasks.dueDate), asc(tasks.dueTime), asc(tasks.position))
    .all();

  for (const task of nextDue) {
    const progress = task.projectId ? result.get(task.projectId) : undefined;
    if (progress && progress.nextDueTask === null && task.dueDate) {
      progress.nextDueTask = { id: task.id, title: task.title, dueDate: task.dueDate };
    }
  }

  return result;
}

function toSummary(row: ProjectRow, progress: ProjectProgress | undefined): ProjectSummary {
  return { ...row, progress: progress ?? emptyProgress() };
}

export function listProjects(db: Db, filter: { archived?: boolean } = {}): ProjectSummary[] {
  const archived = filter.archived ?? false;

  const rows: ProjectRow[] = db
    .select(projectSelection)
    .from(projects)
    .where(eq(projects.archived, archived))
    .orderBy(asc(projects.position), asc(projects.name))
    .all();

  const progress = progressFor(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => toSummary(row, progress.get(row.id)));
}

function requireProject(db: Db, id: string): ProjectRow {
  const row: ProjectRow | undefined = db
    .select(projectSelection)
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!row) throw new ServiceError('Project not found', 404);
  return row;
}

export function getProject(db: Db, id: string): ProjectSummary {
  const row = requireProject(db, id);
  return toSummary(row, progressFor(db, [id]).get(id));
}

export function createProject(db: Db, body: CreateProjectBody): ProjectSummary {
  const positionRow = db
    .select({ value: sql<number>`coalesce(max(${projects.position}), -1) + 1` })
    .from(projects)
    .get();

  const inserted = db
    .insert(projects)
    .values({
      name: body.name,
      description: body.description ?? '',
      targetDate: body.targetDate ?? null,
      position: Number(positionRow?.value ?? 0),
    })
    .returning({ id: projects.id })
    .get();

  return getProject(db, inserted.id);
}

export function updateProject(db: Db, id: string, body: UpdateProjectBody): ProjectSummary {
  requireProject(db, id);

  const patch: Partial<typeof projects.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.targetDate !== undefined) patch.targetDate = body.targetDate;
  if (body.archived !== undefined) patch.archived = body.archived;
  if (body.aiExcluded !== undefined) patch.aiExcluded = body.aiExcluded;
  if (body.position !== undefined) patch.position = body.position;

  db.update(projects).set(patch).where(eq(projects.id, id)).run();

  return getProject(db, id);
}

/**
 * Deleting a project keeps its work: tasks fall back to the Inbox and its
 * milestones are removed with it (PROGRESS D7). Both are foreign keys.
 */
export function deleteProject(db: Db, id: string): void {
  undoableProjectDelete(db, id);
  const result = db.delete(projects).where(eq(projects.id, id)).run();
  if (result.changes === 0) throw new ServiceError('Project not found', 404);
}
