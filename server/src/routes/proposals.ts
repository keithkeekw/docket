import { applyProposalBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { applyProposal, discardProposal, getProposal } from '../services/proposals';

export function registerProposalRoutes(app: Hono, db: Db): void {
  app.get('/api/proposals/:id', (c) => c.json({ proposal: getProposal(db, c.req.param('id')) }));

  app.post('/api/proposals/:id/apply', async (c) => {
    const parsed = applyProposalBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ proposal: applyProposal(db, c.req.param('id'), parsed.data.items) });
  });

  app.post('/api/proposals/:id/discard', (c) =>
    c.json({ proposal: discardProposal(db, c.req.param('id')) }),
  );
}
