import { randomUUID } from 'node:crypto';
import {
  prioritySchema,
  proposalItemSchema,
  type Proposal,
  type ProposalFeature,
  type ProposalItem,
  type ProposalItemFields,
  type ProposalItemDisplay,
} from '@app/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { extractJson, makeCompletion, type Completion } from '../ai/client';
import { loadPrompt } from '../ai/prompts';
import { milestones, projects, proposals as proposalsTable } from '../db/schema';
import type { Db } from '../db/types';
import { localDateString } from '../lib/dates';
import { ServiceError } from '../lib/errors';
import { deriveLinkLabel } from '../lib/link-label';
import { addLink } from './links';
import { createMilestone } from './milestones';
import { listStatuses } from './statuses';
import { setTaskTags } from './tags';
import { createTask, deleteTask, moveTask, updateTask } from './tasks';

// ---------------------------------------------------------------------------
// What the model is allowed to return (names, not IDs — TECHSTACK §6.2)
// ---------------------------------------------------------------------------

const modelTaskSchema = z.object({
  title: z.string().trim().min(1).max(500),
  notes: z.string().max(20_000).nullish(),
  project: z.string().trim().min(1).max(200).nullish(),
  milestone: z.string().trim().min(1).max(200).nullish(),
  status: z.string().trim().min(1).max(60).nullish(),
  priority: prioritySchema.nullish(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  estimateMinutes: z.number().int().positive().max(100_000).nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).nullish(),
  link: z
    .object({ url: z.string().min(1).max(2_000), label: z.string().trim().max(40).nullish() })
    .nullish(),
});

const modelCaptureSchema = z.object({
  tasks: z.array(modelTaskSchema).min(1).max(20),
});

type ModelTask = z.infer<typeof modelTaskSchema>;

const storedPayloadSchema = z.object({
  items: z.array(proposalItemSchema),
});

// ---------------------------------------------------------------------------
// Context: names the model can use, excluding AI-excluded projects (FR-25)
// ---------------------------------------------------------------------------

type CaptureContext = {
  today: string;
  statuses: string[];
  projects: Array<{ name: string; milestones: string[] }>;
  /** Names only, never tasks or descriptions, so a note can explain a miss. */
  excluded: string[];
};

type ProjectRow = { id: string; name: string; archived: boolean; aiExcluded: boolean };
type MilestoneRow = { id: string; projectId: string; name: string };
type StatusRow = { id: string; name: string };

type Lookups = { projects: ProjectRow[]; milestones: MilestoneRow[]; statuses: StatusRow[] };

function loadLookups(db: Db): Lookups {
  return {
    projects: db
      .select({
        id: projects.id,
        name: projects.name,
        archived: projects.archived,
        aiExcluded: projects.aiExcluded,
      })
      .from(projects)
      .all(),
    milestones: db
      .select({ id: milestones.id, projectId: milestones.projectId, name: milestones.name })
      .from(milestones)
      .all(),
    statuses: listStatuses(db).map((status) => ({ id: status.id, name: status.name })),
  };
}

function captureContext(now: Date, lookups: Lookups): CaptureContext {
  const usable = lookups.projects.filter((project) => !project.archived && !project.aiExcluded);

  return {
    today: localDateString(now),
    statuses: lookups.statuses.map((status) => status.name),
    projects: usable.map((project) => ({
      name: project.name,
      milestones: lookups.milestones
        .filter((milestone) => milestone.projectId === project.id)
        .map((milestone) => milestone.name),
    })),
    excluded: lookups.projects
      .filter((project) => project.aiExcluded && !project.archived)
      .map((project) => project.name),
  };
}

const normalise = (value: string): string => value.trim().toLowerCase();

function resolveTask(task: ModelTask, context: CaptureContext, lookups: Lookups): ProposalItem {
  const { projects: projectRows, milestones: milestoneRows } = lookups;
  const notes: string[] = [];

  let projectId: string | null = null;
  let projectName: string | null = null;
  let milestoneId: string | null = null;
  let milestoneName: string | null = null;

  if (task.project) {
    const match = projectRows.find(
      (project) =>
        !project.archived && normalise(project.name) === normalise(task.project ?? ''),
    );

    if (match && !match.aiExcluded) {
      projectId = match.id;
      projectName = match.name;
    } else if (match?.aiExcluded || context.excluded.some((name) => normalise(name) === normalise(task.project ?? ''))) {
      notes.push(`"${task.project}" is excluded from AI, so this went to the Inbox.`);
    } else {
      notes.push(`No project called "${task.project}" — saved to the Inbox.`);
    }
  }

  if (task.milestone) {
    const match =
      projectId === null
        ? undefined
        : milestoneRows.find(
            (milestone) =>
              milestone.projectId === projectId &&
              normalise(milestone.name) === normalise(task.milestone ?? ''),
          );

    if (match) {
      milestoneId = match.id;
      milestoneName = match.name;
    } else {
      notes.push(`No milestone called "${task.milestone}" in that project.`);
    }
  }

  let statusId: string | undefined;
  let statusName: string | null = null;
  if (task.status) {
    const match = lookups.statuses.find(
      (status) => normalise(status.name) === normalise(task.status ?? ''),
    );

    if (match) {
      statusId = match.id;
      statusName = match.name;
    } else {
      notes.push(`No status called "${task.status}" — left at the default.`);
    }
  }

  let link: ProposalItemFields['link'] = null;
  if (task.link?.url) {
    try {
      const url = new URL(task.link.url).toString();
      link = { url, label: task.link.label ?? deriveLinkLabel(url) };
    } catch {
      notes.push('The link was not a valid URL, so it was dropped.');
    }
  }

  const tags = task.tags ? [...new Set(task.tags.map((tag) => tag.trim()))].slice(0, 5) : [];

  return {
    id: randomUUID(),
    op: 'create_task',
    fields: {
      title: task.title,
      ...(task.notes ? { notes: task.notes } : {}),
      projectId,
      milestoneId,
      ...(statusId ? { statusId } : {}),
      ...(task.priority ? { priority: task.priority } : {}),
      ...(task.dueDate ? { dueDate: task.dueDate } : {}),
      ...(task.dueTime ? { dueTime: task.dueTime } : {}),
      ...(task.estimateMinutes ? { estimateMinutes: task.estimateMinutes } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      ...(link ? { link } : {}),
    },
    display: {
      projectName,
      milestoneName,
      statusName,
    } satisfies ProposalItemDisplay,
    aiNote: notes.length > 0 ? notes.join(' ') : null,
  };
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

export type CaptureOptions = { complete?: Completion; now?: Date };

type AskResult = { ok: true; tasks: ModelTask[] } | { ok: false; reason: string };

async function ask(
  complete: Completion,
  input: { system: string; user: string },
): Promise<AskResult> {
  const { text } = await complete({ feature: 'capture', ...input });
  const json = extractJson(text);

  if (json === null) return { ok: false, reason: 'the reply was not JSON' };

  const parsed = modelCaptureSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues.map((issue) => issue.message).join('; ') };
  }

  return { ok: true, tasks: parsed.data.tasks };
}

/**
 * `POST /api/ai/capture` (FR-3): ask, validate, retry once with the validation
 * error, then save a **pending** proposal. Nothing touches tasks until the user
 * confirms (FR-23).
 */
export async function captureProposal(
  db: Db,
  text: string,
  options: CaptureOptions = {},
): Promise<Proposal> {
  const trimmed = text.trim();
  if (!trimmed) throw new ServiceError('Type something to capture.', 400);

  const complete = options.complete ?? makeCompletion(db);
  const lookups = loadLookups(db);
  const context = captureContext(options.now ?? new Date(), lookups);
  const system = loadPrompt('capture');
  const user = `Data:\n${JSON.stringify(context, null, 2)}\n\nInput: ${trimmed}`;

  const first = await ask(complete, { system, user });
  const second = first.ok
    ? first
    : await ask(complete, {
        system,
        user: `${user}\n\nYour previous reply was rejected (${first.reason}). Reply with the JSON object only.`,
      });

  if (!second.ok) {
    throw new ServiceError('The model returned something unusable. Nothing was saved.', 502);
  }

  const items = second.tasks.map((task) => resolveTask(task, context, lookups));
  return storeProposal(db, 'capture', trimmed, items);
}

// ---------------------------------------------------------------------------
// Storage and apply
// ---------------------------------------------------------------------------

function storeProposal(
  db: Db,
  feature: ProposalFeature,
  inputText: string,
  items: ProposalItem[],
): Proposal {
  const inserted = db
    .insert(proposalsTable)
    .values({ feature, inputText, payloadJson: JSON.stringify({ items }) })
    .returning({ id: proposalsTable.id })
    .get();

  return getProposal(db, inserted.id);
}

export function getProposal(db: Db, id: string): Proposal {
  const row = db.select().from(proposalsTable).where(eq(proposalsTable.id, id)).get();
  if (!row) throw new ServiceError('Proposal not found', 404);

  let payload: z.infer<typeof storedPayloadSchema>;
  try {
    payload = storedPayloadSchema.parse(JSON.parse(row.payloadJson));
  } catch {
    throw new ServiceError('That proposal is unreadable', 500);
  }

  return {
    id: row.id,
    feature: row.feature,
    inputText: row.inputText,
    items: payload.items,
    status: row.status,
    createdAt: row.createdAt,
  };
}

function applyItem(db: Db, item: ProposalItem): void {
  const fields = item.fields;

  switch (item.op) {
    case 'create_task': {
      if (!fields.title) throw new ServiceError('A proposed task needs a title.', 400);

      const task = createTask(db, {
        title: fields.title,
        notes: fields.notes ?? undefined,
        projectId: fields.projectId ?? undefined,
        milestoneId: fields.milestoneId ?? undefined,
        statusId: fields.statusId ?? undefined,
        priority: fields.priority ?? undefined,
        dueDate: fields.dueDate ?? undefined,
        dueTime: fields.dueTime ?? undefined,
        estimateMinutes: fields.estimateMinutes ?? undefined,
      });

      if (fields.tags && fields.tags.length > 0) setTaskTags(db, task.id, fields.tags);
      if (fields.link?.url) addLink(db, task.id, { url: fields.link.url, label: fields.link.label });
      return;
    }

    case 'update_task': {
      if (!item.targetId) throw new ServiceError('An update needs a task to update.', 400);

      updateTask(db, item.targetId, {
        title: fields.title,
        notes: fields.notes,
        statusId: fields.statusId,
        priority: fields.priority,
        dueDate: fields.dueDate,
        dueTime: fields.dueTime,
        estimateMinutes: fields.estimateMinutes,
        projectId: fields.projectId,
        milestoneId: fields.milestoneId,
      });

      if (fields.tags) setTaskTags(db, item.targetId, fields.tags);
      return;
    }

    case 'move_task': {
      if (!item.targetId) throw new ServiceError('A move needs a task to move.', 400);

      moveTask(db, item.targetId, {
        projectId: fields.projectId ?? null,
        milestoneId: fields.milestoneId ?? null,
      });
      return;
    }

    case 'delete_task': {
      if (!item.targetId) throw new ServiceError('A delete needs a task to delete.', 400);
      deleteTask(db, item.targetId);
      return;
    }

    case 'create_milestone': {
      if (!fields.projectId) throw new ServiceError('A milestone needs a project.', 400);
      if (!fields.title) throw new ServiceError('A milestone needs a name.', 400);

      createMilestone(db, fields.projectId, { name: fields.title });
      return;
    }
  }
}

/**
 * `POST /api/proposals/:id/apply` (FR-23). Everything lands in one transaction,
 * so a bad item leaves the database untouched (NFR-6).
 */
export function applyProposal(db: Db, id: string, items: ProposalItem[]): Proposal {
  const proposal = getProposal(db, id);
  if (proposal.status !== 'pending') {
    throw new ServiceError('That proposal was already handled.', 409);
  }

  const stored = new Map(proposal.items.map((item) => [item.id, item]));
  let editedCount = 0;

  db.transaction(() => {
    for (const item of items) {
      const original = stored.get(item.id);
      if (original && original.fields.title !== item.fields.title) editedCount += 1;
      applyItem(db, item);
    }

    db.update(proposalsTable)
      .set({
        status: 'applied',
        resolvedAt: new Date().toISOString(),
        acceptedCount: items.length,
        editedCount,
      })
      .where(eq(proposalsTable.id, id))
      .run();
  });

  return getProposal(db, id);
}

export function discardProposal(db: Db, id: string): Proposal {
  const proposal = getProposal(db, id);
  if (proposal.status !== 'pending') {
    throw new ServiceError('That proposal was already handled.', 409);
  }

  db.update(proposalsTable)
    .set({ status: 'discarded', resolvedAt: new Date().toISOString() })
    .where(eq(proposalsTable.id, id))
    .run();

  return getProposal(db, id);
}
