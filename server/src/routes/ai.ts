import { aiBreakdownBodySchema, aiCaptureBodySchema, aiChatBodySchema, aiChecklistBodySchema, aiProjectSummaryBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { chat } from '../services/chat';
import { generateChecklist } from '../services/checklist';
import { generateProjectSummary } from '../services/project-summary';
import { breakdownProposal, captureProposal } from '../services/proposals';

export function registerAiRoutes(app: Hono, db: Db, uploadsDir: string): void {
  // FR-3. Returns a pending proposal; nothing is written until /apply (FR-23).
  app.post('/api/ai/capture', async (c) => {
    const parsed = aiCaptureBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json(
      {
        proposal: await captureProposal(db, parsed.data.text, {
          projectId: parsed.data.projectId,
          statusId: parsed.data.statusId,
          milestoneId: parsed.data.milestoneId,
        }),
      },
      201,
    );
  });

  // FR-18. Same preview/confirm path as capture; milestones apply first.
  app.post('/api/ai/breakdown', async (c) => {
    const parsed = aiBreakdownBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ proposal: await breakdownProposal(db, parsed.data.projectId) }, 201);
  });

  // FR-22. Read-only tools; any writes come back as a pending proposal (FR-23).
  app.post('/api/ai/chat', async (c) => {
    const parsed = aiChatBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json(await chat(db, parsed.data.messages));
  });

  // Generates a checklist for an existing task using AI.
  app.post('/api/ai/checklist', async (c) => {
    const parsed = aiChecklistBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json(await generateChecklist(db, parsed.data.taskId, uploadsDir));
  });

  // Generates a prose summary of a project's current status using AI.
  app.post('/api/ai/project-summary', async (c) => {
    const parsed = aiProjectSummaryBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json(await generateProjectSummary(db, parsed.data.projectId));
  });
}
