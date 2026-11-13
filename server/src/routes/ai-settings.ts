import { updateAiSettingsBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { getAiSettings, updateAiSettings } from '../services/ai-settings';

export function registerAiSettingsRoutes(app: Hono, db: Db): void {
  app.get('/api/settings/ai', (c) => c.json(getAiSettings(db)));

  app.put('/api/settings/ai', async (c) => {
    const parsed = updateAiSettingsBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json(updateAiSettings(db, parsed.data));
  });
}
