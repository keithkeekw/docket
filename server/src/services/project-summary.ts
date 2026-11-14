import type { AiProjectSummaryResponse } from '@app/shared';
import { asc, desc, eq } from 'drizzle-orm';
import { makeCompletion, requireFeatureConfig } from '../ai/client';
import { loadPrompt } from '../ai/prompts';
import { milestones, projects, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { localDateString, localWeekday } from '../lib/dates';
import { ServiceError } from '../lib/errors';

const MAX_OPEN_TASKS = 30;
const MAX_COMPLETED_TASKS = 10;

function describeTask(task: { title: string; statusName: string; dueDate: string | null }): string {
  return `- ${task.title} [${task.statusName}${task.dueDate ? `, due ${task.dueDate}` : ''}]`;
}

export async function generateProjectSummary(
  db: Db,
  projectId: string,
): Promise<AiProjectSummaryResponse> {
  const project = db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      targetDate: projects.targetDate,
      aiExcluded: projects.aiExcluded,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!project) throw new ServiceError('Project not found', 404);
  if (project.aiExcluded) throw new ServiceError('That project is excluded from AI.', 400);

  requireFeatureConfig(db, 'summarize');

  const allTasks = db
    .select({
      title: tasks.title,
      statusName: statuses.name,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .innerJoin(statuses, eq(tasks.statusId, statuses.id))
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.position))
    .all();

  const recentlyCompleted = db
    .select({ title: tasks.title, completedAt: tasks.completedAt })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.completedAt))
    .limit(MAX_COMPLETED_TASKS)
    .all()
    .filter((task) => task.completedAt !== null);

  const allMilestones = db
    .select({ name: milestones.name, completedAt: milestones.completedAt })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.position))
    .all();

  const now = new Date();
  const today = localDateString(now);
  const done = allTasks.filter((t) => t.completedAt !== null).length;
  const total = allTasks.length;
  const open = allTasks.filter((t) => t.completedAt === null);
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const shownOpen = open.slice(0, MAX_OPEN_TASKS);

  const lines: string[] = [
    `Today: ${today} (${localWeekday(now)})`,
    `Project: ${project.name}`,
    project.description ? `Description: ${project.description}` : 'Description: (none)',
    project.targetDate ? `Target date: ${project.targetDate}` : 'Target date: (none)',
    `Progress: ${done} of ${total} tasks done`,
    allMilestones.length > 0
      ? `Milestones: ${allMilestones.map((m) => `${m.name}${m.completedAt ? ' (done)' : ''}`).join(', ')}`
      : 'Milestones: (none)',
    overdue.length > 0
      ? `Overdue tasks (${overdue.length}):\n${overdue.map(describeTask).join('\n')}`
      : 'Overdue tasks: none',
    open.length === 0
      ? 'Open tasks: none'
      : `Open tasks (${open.length}${open.length > shownOpen.length ? `, first ${shownOpen.length} shown` : ''}):\n${shownOpen.map(describeTask).join('\n')}`,
    recentlyCompleted.length > 0
      ? `Recently completed (newest first):\n${recentlyCompleted
          .map(
            (t) =>
              `- ${t.title} [done ${t.completedAt ? localDateString(new Date(t.completedAt)) : ''}]`,
          )
          .join('\n')}`
      : 'Recently completed: none',
  ];

  const complete = makeCompletion(db);
  const system = loadPrompt(db, 'project-summary');
  const result = await complete({ feature: 'summarize', system, user: lines.join('\n\n') });

  const text = result.text.trim();
  if (!text) throw new ServiceError('The model returned an empty summary.', 502);

  return { summary: text };
}
