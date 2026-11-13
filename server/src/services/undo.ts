import { eq } from 'drizzle-orm';
import {
  checklistItems,
  milestones,
  projects,
  taskAttachments,
  taskLinks,
  taskTags,
  tasks,
} from '../db/schema';
import type { Db } from '../db/types';

export type UndoEntry = { label: string; undo: () => void };

/**
 * One slot, in memory: FR-29 asks for "the last destructive action", not a
 * history. A restart, or restoring a backup, forgets it (D66).
 */
let last: UndoEntry | null = null;

export function rememberUndo(entry: UndoEntry): void {
  last = entry;
}

export function undoLabel(): string | null {
  return last?.label ?? null;
}

export function clearUndo(): void {
  last = null;
}

export function runUndo(): string | null {
  if (!last) return null;

  const entry = last;
  last = null;
  entry.undo();

  return entry.label;
}

/**
 * Snapshots a task and its children before deletion, then registers the restore.
 * Call immediately before `DELETE`.
 */
export function undoableTaskDelete(db: Db, taskId: string): void {
  const row = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!row) return;

  const children = {
    checklist: db.select().from(checklistItems).where(eq(checklistItems.taskId, taskId)).all(),
    links: db.select().from(taskLinks).where(eq(taskLinks.taskId, taskId)).all(),
    attachments: db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.taskId, taskId))
      .all(),
    tags: db.select().from(taskTags).where(eq(taskTags.taskId, taskId)).all(),
  };

  rememberUndo({
    label: `Task “${row.title}” deleted`,
    undo: () => {
      db.insert(tasks).values(row).run();
      if (children.checklist.length > 0) {
        db.insert(checklistItems).values(children.checklist).run();
      }
      if (children.links.length > 0) db.insert(taskLinks).values(children.links).run();
      // Attachment rows are restored here; their files deliberately stay on
      // disk until the next startup prune (so undo brings the uploads back).
      if (children.attachments.length > 0) {
        db.insert(taskAttachments).values(children.attachments).run();
      }
      if (children.tags.length > 0) db.insert(taskTags).values(children.tags).run();
    },
  });
}

/** A deleted project keeps its tasks; the undo restores the project, its milestones and the links. */
export function undoableProjectDelete(db: Db, projectId: string): void {
  const row = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!row) return;

  const milestoneRows = db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .all();
  const taskLinksBefore = db
    .select({ id: tasks.id, projectId: tasks.projectId, milestoneId: tasks.milestoneId })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .all();

  rememberUndo({
    label: `Project “${row.name}” deleted`,
    undo: () => {
      db.insert(projects).values(row).run();
      if (milestoneRows.length > 0) db.insert(milestones).values(milestoneRows).run();

      for (const task of taskLinksBefore) {
        db.update(tasks)
          .set({ projectId: task.projectId, milestoneId: task.milestoneId })
          .where(eq(tasks.id, task.id))
          .run();
      }
    },
  });
}

/** Deleting a milestone drops its tasks to project level; undo puts them back. */
export function undoableMilestoneDelete(db: Db, milestoneId: string): void {
  const row = db.select().from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!row) return;

  const taskIds = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.milestoneId, milestoneId))
    .all();

  rememberUndo({
    label: `Milestone “${row.name}” deleted`,
    undo: () => {
      db.insert(milestones).values(row).run();

      for (const task of taskIds) {
        db.update(tasks).set({ milestoneId }).where(eq(tasks.id, task.id)).run();
      }
    },
  });
}
