import type { CreateTaskLinkBody, TaskLink } from '@app/shared';
import { eq } from 'drizzle-orm';
import { taskLinks, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';
import { deriveLinkLabel } from '../lib/link-label';

const linkSelection = {
  id: taskLinks.id,
  taskId: taskLinks.taskId,
  url: taskLinks.url,
  label: taskLinks.label,
};

/** FR-16: the label is derived on save unless the caller supplies one. */
export function addLink(db: Db, taskId: string, body: CreateTaskLinkBody): TaskLink {
  const task = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) throw new ServiceError('Task not found', 404);

  return db
    .insert(taskLinks)
    .values({
      taskId,
      url: body.url,
      label: body.label ?? deriveLinkLabel(body.url),
    })
    .returning(linkSelection)
    .get();
}

export function deleteLink(db: Db, id: string): void {
  const result = db.delete(taskLinks).where(eq(taskLinks.id, id)).run();
  if (result.changes === 0) throw new ServiceError('Link not found', 404);
}
