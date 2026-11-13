import { updateApplyBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import { invalidBody, readJson } from '../lib/http';
import {
  getUpdateInfo,
  isSupervised,
  resetUpdateCache,
  readUpdateStatus,
  writeUpdateRequest,
  writeUpdateStatus,
} from '../services/updates';

/**
 * Read-only release check plus the one endpoint that asks the supervisor to
 * replace the checkout. The app binds to loopback only, and the tag must match
 * the latest GitHub release, so the endpoint cannot run arbitrary git refs.
 */
export function registerUpdateRoutes(app: Hono): void {
  app.get('/api/updates', async (c) => {
    // The button is an explicit check, so bypass the server-side cache.
    if (c.req.query('refresh') === '1') resetUpdateCache();
    return c.json(await getUpdateInfo());
  });

  app.get('/api/updates/status', (c) => c.json(readUpdateStatus()));

  app.post('/api/updates/apply', async (c) => {
    const parsed = updateApplyBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    const info = await getUpdateInfo();
    if (!info.latest) {
      return c.json({ error: 'No GitHub release is available to install.' }, 409);
    }
    if (info.latest.tag !== parsed.data.tag) {
      return c.json({ error: 'That release is no longer the latest one.' }, 409);
    }

    const status = readUpdateStatus();
    if (status.state === 'requested' || status.state === 'updating') {
      return c.json({ error: 'An update is already in progress.' }, 409);
    }

    if (!isSupervised()) {
      return c.json({ error: 'Start Docket with "npm start" to enable in-app updates.' }, 400);
    }

    writeUpdateRequest(parsed.data.tag);
    writeUpdateStatus({
      state: 'requested',
      tag: parsed.data.tag,
      message: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });

    // Let the 202 response flush before the supervisor takes over.
    setTimeout(() => {
      process.exit(75);
    }, 300);

    return c.json({ accepted: true }, 202);
  });
}
