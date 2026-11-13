import OpenAI from 'openai';
import { updateAiSettingsBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import { BASE_URLS, API_KEYS } from '../ai/client';
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

  // Returns the model list for a configured provider so the UI can offer a dropdown.
  app.get('/api/ai/models', async (c) => {
    const provider = c.req.query('provider');
    if (provider !== 'deepseek' && provider !== 'openrouter') {
      return c.json({ error: 'provider must be deepseek or openrouter' }, 400);
    }

    const apiKey = API_KEYS[provider];
    if (!apiKey) {
      return c.json({ error: 'Provider is not configured — add its key to .env' }, 503);
    }

    try {
      const client = new OpenAI({ apiKey, baseURL: BASE_URLS[provider] });
      const list = await client.models.list();
      const models = list.data
        .map((m) => m.id)
        .sort((a, b) => a.localeCompare(b));
      return c.json({ models });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message.slice(0, 200) : 'unknown error';
      return c.json({ error: `Could not fetch models: ${detail}` }, 502);
    }
  });
}
