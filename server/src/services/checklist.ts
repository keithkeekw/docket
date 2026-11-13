import type { AiChecklistResponse, ChecklistItem, CreateChecklistItemBody, UpdateChecklistItemBody } from '@app/shared';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { extractJson, makeCompletion, requireFeatureConfig } from '../ai/client';
import { loadPrompt } from '../ai/prompts';
import { checklistItems, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';

const itemSelection = {
  id: checklistItems.id,
  taskId: checklistItems.taskId,
  title: checklistItems.title,
  done: checklistItems.done,
  position: checklistItems.position,
};

type ItemRow = {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  position: number;
};

function toItem(row: ItemRow): ChecklistItem {
  return { ...row, done: Boolean(row.done) };
}

function requireTask(db: Db, taskId: string): void {
  const row = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!row) throw new ServiceError('Task not found', 404);
}

function requireItem(db: Db, id: string): ItemRow {
  const row: ItemRow | undefined = db
    .select(itemSelection)
    .from(checklistItems)
    .where(eq(checklistItems.id, id))
    .get();

  if (!row) throw new ServiceError('Checklist item not found', 404);
  return row;
}

export function listChecklist(db: Db, taskId: string): ChecklistItem[] {
  requireTask(db, taskId);

  return db
    .select(itemSelection)
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .orderBy(asc(checklistItems.position), asc(checklistItems.id))
    .all()
    .map(toItem);
}

export function addChecklistItem(
  db: Db,
  taskId: string,
  body: CreateChecklistItemBody,
): ChecklistItem {
  requireTask(db, taskId);

  const positionRow = db
    .select({ value: sql<number>`coalesce(max(${checklistItems.position}), -1) + 1` })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .get();

  const inserted = db
    .insert(checklistItems)
    .values({
      taskId,
      title: body.title,
      position: body.position ?? Number(positionRow?.value ?? 0),
    })
    .returning(itemSelection)
    .get();

  return toItem(inserted);
}

export function updateChecklistItem(
  db: Db,
  id: string,
  body: UpdateChecklistItemBody,
): ChecklistItem {
  requireItem(db, id);

  const patch: Partial<typeof checklistItems.$inferInsert> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.done !== undefined) patch.done = body.done;
  if (body.position !== undefined) patch.position = body.position;

  if (Object.keys(patch).length > 0) {
    db.update(checklistItems).set(patch).where(eq(checklistItems.id, id)).run();
  }

  return toItem({ ...requireItem(db, id) });
}

export function deleteChecklistItem(db: Db, id: string): void {
  const result = db.delete(checklistItems).where(eq(checklistItems.id, id)).run();
  if (result.changes === 0) throw new ServiceError('Checklist item not found', 404);
}

const checklistOutputSchema = z.object({ items: z.array(z.string().min(1).max(200)).min(1) });

/** Uses the 'capture' AI feature (the most general one) to generate checklist items. */
export async function generateChecklist(db: Db, taskId: string): Promise<AiChecklistResponse> {
  requireFeatureConfig(db, 'capture');

  const task = db
    .select({ title: tasks.title, notes: tasks.notes })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) throw new ServiceError('Task not found', 404);

  const complete = makeCompletion(db);
  const system = loadPrompt('checklist');
  const user = task.notes
    ? `Task: ${task.title}\nNotes: ${task.notes}`
    : `Task: ${task.title}`;

  let result = await complete({ feature: 'capture', system, user });
  let parsed = checklistOutputSchema.safeParse(extractJson(result.text));

  if (!parsed.success) {
    result = await complete({
      feature: 'capture',
      system,
      user: `${user}\n\nReturn ONLY the JSON object {"items":[...]}. Previous attempt was invalid: ${parsed.error.message.slice(0, 200)}`,
    });
    parsed = checklistOutputSchema.safeParse(extractJson(result.text));
  }

  if (!parsed.success) {
    throw new ServiceError('The model returned an unusable checklist. Nothing was saved.', 502);
  }

  return { items: parsed.data.items };
}
