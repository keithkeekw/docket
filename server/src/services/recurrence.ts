import { and, eq, isNull, sql } from 'drizzle-orm';
// `rrule` is CommonJS: the ESM build exposes its exports as the default, so a
// named import works in Vitest but not in Node (PROGRESS D37).
import rrule from 'rrule';
import { checklistItems, taskLinks, taskTags, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { defaultOpenStatusId } from './statuses';

const { RRule } = rrule;

const pad = (value: number): string => String(value).padStart(2, '0');

function asLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DAY_MS = 86_400_000;

function utcDay(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Moves a planned date by the gap between two due dates, so the plan keeps its lead time. */
export function shiftByDueGap(date: string | null, fromDue: string, toDue: string): string | null {
  if (date === null) return null;
  const shifted = new Date(
    utcDay(date) + Math.round((utcDay(toDue) - utcDay(fromDue)) / DAY_MS) * DAY_MS,
  );
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export type NextOccurrence = {
  dueDate: string;
  dueTime: string | null;
};

/**
 * The next occurrence after `dueDate`, exclusive — a daily task due today moves
 * to tomorrow. `dtstart` is the task's own local date and time, which keeps a
 * floating wall-clock time in line with D17.
 */
export function nextOccurrence(
  ruleString: string,
  dueDate: string,
  dueTime: string | null,
): NextOccurrence | null {
  const [year, month, day] = dueDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const time = dueTime && /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : '00:00';
  const [hours, minutes] = time.split(':').map(Number);

  const dtstart = new Date(year, month - 1, day, hours ?? 0, minutes ?? 0, 0, 0);
  if (Number.isNaN(dtstart.getTime())) return null;

  let next: Date | null;
  try {
    const options = RRule.parseString(ruleString);

    // An empty or partial string would default to YEARLY; require an explicit
    // frequency so a typo can never schedule an annual task.
    if (options.freq === undefined) return null;

    next = new RRule({ ...options, dtstart }).after(dtstart, false);
  } catch {
    return null;
  }

  if (!next) return null;
  return { dueDate: asLocalDate(next), dueTime: dueTime ?? null };
}

/**
 * FR-15 / TECHSTACK §4: one row per occurrence. The next task copies the
 * fields, links and tags, and the checklist unticked; `recurrence_parent_id`
 * points at the first task in the series and the rule carries forward.
 *
 * Returns the new task id, or null when there is nothing to create (no rule,
 * no due date, an unparseable rule, or the occurrence already exists — ticking
 * a task off, on and off again must not duplicate it).
 */
export function createNextOccurrence(db: Db, taskId: string): string | null {
  const task = db
    .select({
      id: tasks.id,
      title: tasks.title,
      notes: tasks.notes,
      projectId: tasks.projectId,
      milestoneId: tasks.milestoneId,
      priority: tasks.priority,
      startDate: tasks.startDate,
      endDate: tasks.endDate,
      dueDate: tasks.dueDate,
      dueTime: tasks.dueTime,
      estimateMinutes: tasks.estimateMinutes,
      recurrenceRule: tasks.recurrenceRule,
      recurrenceParentId: tasks.recurrenceParentId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task || !task.recurrenceRule || !task.dueDate) return null;

  const next = nextOccurrence(task.recurrenceRule, task.dueDate, task.dueTime);
  if (!next) return null;

  const parentId = task.recurrenceParentId ?? task.id;

  const sibling = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.recurrenceParentId, parentId), eq(tasks.dueDate, next.dueDate)))
    .get();

  if (sibling) return null;

  const statusId = defaultOpenStatusId(db);
  if (!statusId) return null;

  const positionRow = db
    .select({ value: sql<number>`coalesce(max(${tasks.position}), -1) + 1` })
    .from(tasks)
    .where(task.projectId === null ? isNull(tasks.projectId) : eq(tasks.projectId, task.projectId))
    .get();

  const inserted = db
    .insert(tasks)
    .values({
      title: task.title,
      notes: task.notes,
      projectId: task.projectId,
      milestoneId: task.milestoneId,
      statusId,
      priority: task.priority,
      startDate: shiftByDueGap(task.startDate, task.dueDate, next.dueDate),
      endDate: shiftByDueGap(task.endDate, task.dueDate, next.dueDate),
      dueDate: next.dueDate,
      dueTime: next.dueTime,
      estimateMinutes: task.estimateMinutes,
      recurrenceRule: task.recurrenceRule,
      recurrenceParentId: parentId,
      position: Number(positionRow?.value ?? 0),
    })
    .returning({ id: tasks.id })
    .get();

  const checklist = db
    .select({
      title: checklistItems.title,
      position: checklistItems.position,
    })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, task.id))
    .all();

  for (const item of checklist) {
    db.insert(checklistItems)
      .values({ taskId: inserted.id, title: item.title, done: false, position: item.position })
      .run();
  }

  const links = db
    .select({ url: taskLinks.url, label: taskLinks.label })
    .from(taskLinks)
    .where(eq(taskLinks.taskId, task.id))
    .all();

  for (const link of links) {
    db.insert(taskLinks).values({ taskId: inserted.id, url: link.url, label: link.label }).run();
  }

  const tagRows = db
    .select({ tagId: taskTags.tagId })
    .from(taskTags)
    .where(eq(taskTags.taskId, task.id))
    .all();

  for (const row of tagRows) {
    db.insert(taskTags).values({ taskId: inserted.id, tagId: row.tagId }).run();
  }

  return inserted.id;
}
