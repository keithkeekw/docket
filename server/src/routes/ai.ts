import { aiBreakdownBodySchema, aiCaptureBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { breakdownProposal, captureProposal } from '../services/proposals';

export function registerAiRoutes(app: Hono, db: Db): void {
  // FR-3. Returns a pending proposal; nothing is written until /apply (FR-23).
  app.post('/api/ai/capture', async (c) => {
    const parsed = aiCaptureBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ proposal: await captureProposal(db, parsed.data.text) }, 201);
  });

  // FR-18. Same preview/confirm path as capture; milestones apply first.
  app.post('/api/ai/breakdown', async (c) => {
    const parsed = aiBreakdownBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ proposal: await breakdownProposal(db, parsed.data.projectId) }, 201);
  });
}
