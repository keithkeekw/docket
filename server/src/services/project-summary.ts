import type { AiProjectSummaryResponse } from '@app/shared';
import { asc, eq } from 'drizzle-orm';
import { makeCompletion, requireFeatureConfig } from '../ai/client';
import { loadPrompt } from '../ai/prompts';
import { milestones, projects, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';

export async function generateProjectSummary(
  db: Db,
  projectId: string,
): Promise<AiProjectSummaryResponse> {
  requireFeatureConfig(db, 'summarize');

  const project = db
    .select({ id: projects.id, name: projects.name, description: projects.description, targetDate: projects.targetDate })
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!project) throw new ServiceError('Project not found', 404);

  const allTasks = db
    .select({ title: tasks.title, statusId: tasks.statusId, dueDate: tasks.dueDate, completedAt: tasks.completedAt })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.position))
    .all();

  const allMilestones = db
    .select({ name: milestones.name, completedAt: milestones.completedAt })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.position))
    .all();

  const done = allTasks.filter((t) => t.completedAt !== null).length;
  const total = allTasks.length;
  const open = allTasks.filter((t) => t.completedAt === null);
  const overdue = open.filter((t) => t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10));

  const lines: string[] = [
    `Project: ${project.name}`,
    project.description ? `Description: ${project.description}` : '',
    project.targetDate ? `Target date: ${project.targetDate}` : '',
    `Progress: ${done} of ${total} tasks done`,
    overdue.length > 0 ? `Overdue tasks (${overdue.length}): ${overdue.map((t) => t.title).join(', ')}` : '',
    open.length > 0 ? `Open tasks: ${open.map((t) => t.title).slice(0, 20).join(', ')}` : 'All tasks complete.',
    allMilestones.length > 0
      ? `Milestones: ${allMilestones.map((m) => `${m.name}${m.completedAt ? ' (done)' : ''}`).join(', ')}`
      : '',
  ].filter(Boolean);

  const complete = makeCompletion(db);
  const system = loadPrompt(db, 'project-summary');
  const result = await complete({ feature: 'summarize', system, user: lines.join('\n') });

  // The model returns plain prose; wrap it
  const text = result.text.trim();
  if (!text) throw new ServiceError('The model returned an empty summary.', 502);

  return { summary: text };
}
