import type { Proposal, Task } from '@app/shared';
import { desc, eq } from 'drizzle-orm';
import { milestones, projects, reviews, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { localDateString } from '../lib/dates';
import { ServiceError } from '../lib/errors';
import { proposalFromRawProject, proposalFromRawTasks } from '../services/proposals';
import { listProjects } from '../services/projects';
import { listStatuses } from '../services/statuses';
import { listTasks } from '../services/tasks';

/** OpenAI-style function definitions (TECHSTACK §6.4, read-only except proposals). */
export const CHAT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List tasks. Filters are optional and combine.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Text to match in the title or notes' },
          project: { type: 'string', description: 'Project id, or "none" for the Inbox' },
          status: { type: 'string', description: 'Status id' },
          priority: { type: 'integer', enum: [1, 2, 3] },
          tag: { type: 'string' },
          dueFrom: { type: 'string', description: 'YYYY-MM-DD inclusive' },
          dueTo: { type: 'string', description: 'YYYY-MM-DD inclusive' },
          overdue: { type: 'boolean', description: 'Only tasks past their due date' },
          openOnly: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_task',
      description: 'Read one task with its notes.',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_projects',
      description: 'List active projects with progress, current milestone and next due task.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_project_summary',
      description: 'Read one project with progress and milestone names.',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_review',
      description: 'Read the most recent review of a kind (daily, weekly or manual).',
      parameters: {
        type: 'object',
        properties: { kind: { type: 'string', enum: ['daily', 'weekly', 'manual'] } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_tasks',
      description:
        'Prepare new tasks for the user to confirm. Nothing is saved until they approve the preview. Use project, milestone and status names exactly as the other tools return them.',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                notes: { type: 'string' },
                project: { type: 'string' },
                milestone: { type: 'string' },
                status: { type: 'string' },
                priority: { type: 'integer', enum: [1, 2, 3] },
                dueDate: { type: 'string' },
                dueTime: { type: 'string' },
                estimateMinutes: { type: 'integer' },
                tags: { type: 'array', items: { type: 'string' } },
              },
              required: ['title'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_project',
      description:
        'Prepare a new project, optionally with milestones, for the user to confirm. Nothing is saved until they approve the preview. Only include milestones when the user said yes to generating them.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: {
            type: 'string',
            description: 'What the project is for, in the user’s words, tidied up',
          },
          targetDate: { type: 'string', description: 'YYYY-MM-DD, only if the user gave one' },
          milestones: {
            type: 'array',
            description: 'Milestone names in order, 3 to 6 is typical, at most 12',
            items: { type: 'string' },
          },
        },
        required: ['name'],
      },
    },
  },
] as const;

export type ToolRun = { content: string; proposal?: Proposal };

function compactTask(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    project: task.projectName ?? 'Inbox',
    milestone: task.milestoneName,
    status: task.statusName,
    priority: `P${task.priority}`,
    planned: task.startDate || task.endDate ? { start: task.startDate, end: task.endDate } : null,
    due: task.dueDate ? `${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ''}` : null,
    tags: task.tags,
  };
}

function excludedProjectIds(db: Db): Set<string> {
  return new Set(
    db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.aiExcluded, true))
      .all()
      .map((row) => row.id),
  );
}

function yesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateString(date);
}

/**
 * Executes one tool call. Every query goes through the same service code as the
 * UI, and anything belonging to an AI-excluded project is withheld (FR-25).
 */
export function runChatTool(db: Db, name: string, rawArgs: string): ToolRun {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs.trim() ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { content: 'Those arguments were not valid JSON.' };
  }

  const excluded = excludedProjectIds(db);

  switch (name) {
    case 'list_tasks': {
      const rows = listTasks(db, {
        q: typeof args.q === 'string' ? args.q : undefined,
        project: typeof args.project === 'string' ? args.project : undefined,
        statusIds: typeof args.status === 'string' ? [args.status] : undefined,
        priorities: typeof args.priority === 'number' ? [args.priority] : undefined,
        tag: typeof args.tag === 'string' ? args.tag : undefined,
        dueFrom: typeof args.dueFrom === 'string' ? args.dueFrom : undefined,
        dueTo: typeof args.dueTo === 'string' ? args.dueTo : undefined,
        dueBefore: args.overdue === true ? yesterday() : undefined,
        openOnly: args.openOnly === true,
      })
        .filter((task) => task.projectId === null || !excluded.has(task.projectId))
        .slice(0, 40)
        .map(compactTask);

      return { content: JSON.stringify({ tasks: rows }) };
    }

    case 'get_task': {
      if (typeof args.id !== 'string') return { content: 'An id is required.' };

      const task = db
        .select({
          id: tasks.id,
          title: tasks.title,
          notes: tasks.notes,
          projectId: tasks.projectId,
          statusName: statuses.name,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          dueTime: tasks.dueTime,
          estimateMinutes: tasks.estimateMinutes,
          completedAt: tasks.completedAt,
        })
        .from(tasks)
        .innerJoin(statuses, eq(tasks.statusId, statuses.id))
        .where(eq(tasks.id, args.id))
        .get();

      if (!task) return { content: 'No task with that id.' };
      if (task.projectId && excluded.has(task.projectId)) {
        return { content: 'That task belongs to a project excluded from AI.' };
      }

      return { content: JSON.stringify(task) };
    }

    case 'list_projects': {
      const rows = listProjects(db)
        .filter((project) => !project.aiExcluded)
        .map((project) => ({
          id: project.id,
          name: project.name,
          percent: project.progress.percent,
          done: project.progress.done,
          total: project.progress.total,
          currentMilestone: project.progress.currentMilestone?.name ?? null,
          nextDueTask: project.progress.nextDueTask?.title ?? null,
        }));

      return { content: JSON.stringify({ projects: rows }) };
    }

    case 'get_project_summary': {
      if (typeof args.id !== 'string') return { content: 'An id is required.' };

      const project = listProjects(db).find((entry) => entry.id === args.id);
      if (!project) return { content: 'No project with that id.' };
      if (project.aiExcluded) return { content: 'That project is excluded from AI.' };

      const milestoneRows = db
        .select({ name: milestones.name, completedAt: milestones.completedAt })
        .from(milestones)
        .where(eq(milestones.projectId, project.id))
        .all();

      return {
        content: JSON.stringify({
          id: project.id,
          name: project.name,
          description: project.description,
          targetDate: project.targetDate,
          progress: project.progress,
          milestones: milestoneRows,
        }),
      };
    }

    case 'get_review': {
      const kind = typeof args.kind === 'string' ? args.kind : 'daily';
      if (!['daily', 'weekly', 'manual'].includes(kind)) {
        return { content: 'Kind must be daily, weekly or manual.' };
      }

      const review = db
        .select({ contentMd: reviews.contentMd, periodStart: reviews.periodStart })
        .from(reviews)
        .where(eq(reviews.kind, kind as 'daily' | 'weekly' | 'manual'))
        .orderBy(desc(reviews.createdAt))
        .get();

      return { content: review ? JSON.stringify(review) : 'No review of that kind yet.' };
    }

    case 'propose_tasks': {
      try {
        const { proposal, count } = proposalFromRawTasks(db, 'chat', 'Chat', args);
        return {
          content: `Prepared ${count} ${count === 1 ? 'task' : 'tasks'} for the user to confirm.`,
          proposal,
        };
      } catch (cause) {
        return {
          content: cause instanceof ServiceError ? cause.message : 'Those tasks were not valid.',
        };
      }
    }

    case 'propose_project': {
      try {
        const { proposal, milestoneCount } = proposalFromRawProject(db, 'chat', 'Chat', args);
        const milestones =
          milestoneCount === 0
            ? 'no milestones'
            : `${milestoneCount} ${milestoneCount === 1 ? 'milestone' : 'milestones'}`;
        return {
          content: `Prepared the project with ${milestones} for the user to confirm.`,
          proposal,
        };
      } catch (cause) {
        return {
          content: cause instanceof ServiceError ? cause.message : 'That project was not valid.',
        };
      }
    }

    default:
      return { content: `Unknown tool: ${name}` };
  }
}

/**
 * Compact context for models without tool calling (TECHSTACK §6.4 fallback):
 * the same data the tools expose, trimmed so the prompt stays small.
 */
export function chatContextSummary(db: Db): Record<string, unknown> {
  const excluded = excludedProjectIds(db);

  return {
    today: localDateString(),
    statuses: listStatuses(db).map((status) => ({ id: status.id, name: status.name })),
    projects: listProjects(db)
      .filter((project) => !project.aiExcluded)
      .map((project) => ({
        id: project.id,
        name: project.name,
        percent: project.progress.percent,
        done: project.progress.done,
        total: project.progress.total,
        currentMilestone: project.progress.currentMilestone?.name ?? null,
      })),
    openTasks: listTasks(db, { openOnly: true })
      .filter((task) => task.projectId === null || !excluded.has(task.projectId))
      .slice(0, 60)
      .map(compactTask),
  };
}
