import { asc } from 'drizzle-orm';
import {
  aiSettings,
  appSettings,
  checklistItems,
  milestones,
  projects,
  reviews,
  statuses,
  tags,
  taskLinks,
  taskTags,
  tasks,
} from '../db/schema';
import type { Db } from '../db/types';
import { localDateString } from '../lib/dates';

/**
 * FR-28: everything the app knows, in a shape that can be read without this
 * codebase. Statuses, projects, milestones, tasks with their tags/links/
 * checklist, reviews and settings. AI keys are not in the database, so nothing
 * sensitive can leak (NFR-2).
 */
export function exportJson(db: Db): Record<string, unknown> {
  const tagRows = db.select().from(tags).all();
  const tagName = new Map(tagRows.map((tag) => [tag.id, tag.name]));

  const taskRows = db.select().from(tasks).all();
  const checklist = db.select().from(checklistItems).all();
  const links = db.select().from(taskLinks).all();
  const taskTagRows = db.select().from(taskTags).all();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    today: localDateString(),
    statuses: db.select().from(statuses).orderBy(asc(statuses.position)).all(),
    projects: db.select().from(projects).orderBy(asc(projects.position)).all(),
    milestones: db.select().from(milestones).orderBy(asc(milestones.position)).all(),
    tasks: taskRows.map((task) => ({
      ...task,
      tags: taskTagRows
        .filter((row) => row.taskId === task.id)
        .map((row) => tagName.get(row.tagId))
        .filter((name): name is string => Boolean(name)),
      links: links.filter((link) => link.taskId === task.id),
      checklist: checklist.filter((item) => item.taskId === task.id),
    })),
    reviews: db.select().from(reviews).all(),
    settings: {
      app: db.select().from(appSettings).all(),
      ai: db.select().from(aiSettings).all(),
    },
  };
}

function formatDue(task: typeof tasks.$inferSelect): string {
  if (!task.dueDate) return '';
  return ` — due ${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ''}`;
}

function taskLine(
  task: typeof tasks.$inferSelect,
  statusName: string,
  location: string,
): string {
  const done = task.completedAt ? 'x' : ' ';
  const meta = [`P${task.priority}`, statusName, location].join(', ');
  const notes = task.notes ? `\n  > ${task.notes.replace(/\n/g, '\n  > ')}` : '';

  return `- [${done}] ${task.title} (${meta})${formatDue(task)}${notes}`;
}

/** A readable dump for a person or another tool (FR-28). */
export function exportMarkdown(db: Db): string {
  const statusRows = db.select().from(statuses).all();
  const statusName = new Map(statusRows.map((status) => [status.id, status.name]));
  const projectRows = db.select().from(projects).orderBy(asc(projects.position)).all();
  const milestoneRows = db.select().from(milestones).all();
  const taskRows = db
    .select()
    .from(tasks)
    .orderBy(asc(tasks.projectId), asc(tasks.position), asc(tasks.createdAt))
    .all();

  const lines: string[] = [`# Export — ${localDateString()}`, ''];

  for (const project of projectRows) {
    const projectTasks = taskRows.filter((task) => task.projectId === project.id);
    const done = projectTasks.filter((task) => task.completedAt).length;

    lines.push(
      `## ${project.name}${project.archived ? ' (archived)' : ''} — ${done} of ${projectTasks.length} done`,
      '',
    );

    const ownMilestones = milestoneRows.filter((milestone) => milestone.projectId === project.id);
    const unassigned = projectTasks.filter((task) => task.milestoneId === null);

    for (const milestone of ownMilestones) {
      lines.push(`### ${milestone.name}${milestone.completedAt ? ' (done)' : ''}`, '');
      for (const task of projectTasks.filter((entry) => entry.milestoneId === milestone.id)) {
        lines.push(taskLine(task, statusName.get(task.statusId) ?? '', project.name));
      }
      lines.push('');
    }

    if (unassigned.length > 0) {
      if (ownMilestones.length > 0) lines.push('### No milestone', '');
      for (const task of unassigned) {
        lines.push(taskLine(task, statusName.get(task.statusId) ?? '', project.name));
      }
      lines.push('');
    }
  }

  const inbox = taskRows.filter((task) => task.projectId === null);
  if (inbox.length > 0) {
    lines.push(`## Inbox — ${inbox.filter((task) => !task.completedAt).length} open`, '');
    for (const task of inbox) {
      lines.push(taskLine(task, statusName.get(task.statusId) ?? '', 'Inbox'));
    }
    lines.push('');
  }

  const reviewRows = db.select().from(reviews).orderBy(asc(reviews.createdAt)).all();

  if (reviewRows.length > 0) {
    lines.push('## Reviews', '');
    for (const review of reviewRows) {
      lines.push(`### ${review.kind} · ${review.periodStart}`, '', review.contentMd, '');
    }
  }

  lines.push('## Statuses', '');
  for (const status of statusRows) {
    lines.push(`- ${status.name} (${status.category})`);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
