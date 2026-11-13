import { aiSettingsSchema } from '@app/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import type { Db } from '../db/types';
import { env } from '../env';
import { getAiSettings } from '../services/ai-settings';
import { createTestDb } from '../test/helpers';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
  app = createApp(db);
});

afterEach(() => {
  sqlite.close();
});

const json = { 'content-type': 'application/json' };

async function getSettings() {
  const response = await app.request('/api/settings/ai');
  expect(response.status).toBe(200);
  return aiSettingsSchema.parse(await response.json());
}

async function put(body: unknown) {
  const response = await app.request('/api/settings/ai', {
    method: 'PUT',
    headers: json,
    body: JSON.stringify(body),
  });
  return { response, body: (await response.json()) as any };
}

const configured = (key: string) => key.trim() !== '';

describe('GET /api/settings/ai', () => {
  it('lists all five features unconfigured and reports which providers have a key', async () => {
    const body = await getSettings();

    expect(body.features).toEqual([
      { feature: 'capture', provider: null, model: null },
      { feature: 'breakdown', provider: null, model: null },
      { feature: 'review_daily', provider: null, model: null },
      { feature: 'review_weekly', provider: null, model: null },
      { feature: 'chat', provider: null, model: null },
    ]);

    expect(body.providers).toEqual([
      { provider: 'deepseek', configured: configured(env.deepseekApiKey) },
      { provider: 'openrouter', configured: configured(env.openrouterApiKey) },
    ]);
  });

  it('never returns a key, only presence', async () => {
    const raw = JSON.stringify(await (await app.request('/api/settings/ai')).json());

    expect(raw).not.toContain('sk-');
    expect(raw).not.toContain('apiKey');
  });
});

describe('PUT /api/settings/ai', () => {
  it('configures one feature without touching the others', async () => {
    const { response, body } = await put({
      features: [{ feature: 'capture', provider: 'deepseek', model: 'deepseek-chat' }],
    });

    expect(response.status).toBe(200);
    expect(aiSettingsSchema.parse(body).features).toEqual([
      { feature: 'capture', provider: 'deepseek', model: 'deepseek-chat' },
      { feature: 'breakdown', provider: null, model: null },
      { feature: 'review_daily', provider: null, model: null },
      { feature: 'review_weekly', provider: null, model: null },
      { feature: 'chat', provider: null, model: null },
    ]);

    // Persisted, not just echoed.
    expect((await getSettings()).features[0]).toMatchObject({ provider: 'deepseek' });
  });

  it('updates a feature and clears it with nulls', async () => {
    await put({ features: [{ feature: 'chat', provider: 'openrouter', model: 'model-a' }] });
    await put({ features: [{ feature: 'chat', provider: 'openrouter', model: 'model-b' }] });
    expect((await getSettings()).features[4]).toMatchObject({
      provider: 'openrouter',
      model: 'model-b',
    });

    await put({ features: [{ feature: 'chat', provider: null, model: null }] });
    expect((await getSettings()).features[4]).toMatchObject({ provider: null, model: null });
  });

  it('rejects a provider without a model, and a model without a provider', async () => {
    const halfProvider = await put({
      features: [{ feature: 'capture', provider: 'deepseek', model: null }],
    });
    expect(halfProvider.response.status).toBe(400);

    const halfModel = await put({
      features: [{ feature: 'capture', provider: null, model: 'deepseek-chat' }],
    });
    expect(halfModel.response.status).toBe(400);
  });

  it('rejects an unknown feature', async () => {
    const { response } = await put({
      features: [{ feature: 'summarise', provider: 'deepseek', model: 'x' }],
    });
    expect(response.status).toBe(400);
  });
});

describe('getAiSettings', () => {
  it('derives provider status from the keys it is given', () => {
    const body = getAiSettings(db, { deepseek: 'present', openrouter: '  ' });

    expect(body.providers).toEqual([
      { provider: 'deepseek', configured: true },
      { provider: 'openrouter', configured: false },
    ]);
  });
});
