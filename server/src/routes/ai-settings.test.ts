import {
  AI_PROVIDERS,
  aiSettingsSchema,
  promptListSchema,
  promptResponseSchema,
  type AiProvider,
} from '@app/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPrompt } from '../ai/prompts';
import { createApp } from '../app';
import type { Db } from '../db/types';
import { env } from '../env';
import { getAiSettings, providerApiKey, setProviderKey } from '../services/ai-settings';
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
  it('lists all six features unconfigured and reports which providers have a key', async () => {
    const body = await getSettings();

    expect(body.features).toEqual([
      { feature: 'capture', provider: null, model: null },
      { feature: 'breakdown', provider: null, model: null },
      { feature: 'summarize', provider: null, model: null },
      { feature: 'review_daily', provider: null, model: null },
      { feature: 'review_weekly', provider: null, model: null },
      { feature: 'chat', provider: null, model: null },
    ]);

    expect(body.providers.map((entry) => [entry.provider, entry.configured])).toEqual(
      AI_PROVIDERS.map((provider) => [provider, configured(env.apiKeys[provider])]),
    );
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
      { feature: 'summarize', provider: null, model: null },
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
    expect((await getSettings()).features[5]).toMatchObject({
      provider: 'openrouter',
      model: 'model-b',
    });

    await put({ features: [{ feature: 'chat', provider: null, model: null }] });
    expect((await getSettings()).features[5]).toMatchObject({ provider: null, model: null });
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

describe('GET /api/settings/prompts', () => {
  it('lists every prompt the app currently sends, in display order', async () => {
    const response = await app.request('/api/settings/prompts');
    expect(response.status).toBe(200);

    const body = promptListSchema.parse(await response.json());
    expect(body.prompts.map((prompt) => prompt.id)).toEqual([
      'capture',
      'breakdown',
      'project-summary',
      'checklist',
      'review',
      'chat',
    ]);

    for (const prompt of body.prompts) {
      expect(prompt.label.length).toBeGreaterThan(0);
      expect(prompt.content.length).toBeGreaterThan(20);
      expect(prompt.customized).toBe(false);
      expect(prompt.content).toBe(prompt.defaultContent);
    }
  });

  it('saves an override, uses it for AI calls, and resets to the built-in prompt', async () => {
    const edited = 'You are a concise capture assistant. Reply with JSON only.';

    const response = await app.request('/api/settings/prompts/capture', {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ content: edited }),
    });
    expect(response.status).toBe(200);

    const saved = promptResponseSchema.parse(await response.json()).prompt;
    expect(saved).toMatchObject({ id: 'capture', content: edited, customized: true });
    expect(saved.defaultContent).not.toBe(edited);
    expect(loadPrompt(db, 'capture')).toBe(edited);

    const listed = promptListSchema.parse(
      await (await app.request('/api/settings/prompts')).json(),
    );
    expect(listed.prompts.find((prompt) => prompt.id === 'capture')).toEqual(saved);

    const reset = await app.request('/api/settings/prompts/capture', { method: 'DELETE' });
    expect(reset.status).toBe(200);
    const defaults = promptResponseSchema.parse(await reset.json()).prompt;
    expect(defaults.customized).toBe(false);
    expect(defaults.content).toBe(defaults.defaultContent);
    expect(loadPrompt(db, 'capture')).toBe(defaults.defaultContent);
  });

  it('rejects an empty prompt and an unknown prompt id', async () => {
    const empty = await app.request('/api/settings/prompts/capture', {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ content: '   ' }),
    });
    expect(empty.status).toBe(400);

    const unknown = await app.request('/api/settings/prompts/nope', {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ content: 'Hello' }),
    });
    expect(unknown.status).toBe(404);
  });
});

const noEnvKeys = Object.fromEntries(AI_PROVIDERS.map((provider) => [provider, ''])) as Record<
  AiProvider,
  string
>;

describe('getAiSettings', () => {
  it('derives provider status from the .env keys it is given', () => {
    const body = getAiSettings(db, { ...noEnvKeys, deepseek: 'present', openrouter: '  ' });

    expect(body.providers.slice(0, 2)).toEqual([
      { provider: 'deepseek', configured: true, source: 'env', hint: null },
      { provider: 'openrouter', configured: false, source: null, hint: null },
    ]);
  });

  it('prefers a key saved in Settings over .env', () => {
    setProviderKey(db, 'openai', 'sk-saved-0000000000wxyz', noEnvKeys);

    const body = getAiSettings(db, { ...noEnvKeys, openai: 'sk-env-00000000000abcd' });
    expect(body.providers.find((entry) => entry.provider === 'openai')).toEqual({
      provider: 'openai',
      configured: true,
      source: 'settings',
      hint: 'wxyz',
    });
    expect(providerApiKey(db, 'openai', noEnvKeys)).toBe('sk-saved-0000000000wxyz');
  });
});

describe('PUT/DELETE /api/settings/ai/keys/:provider', () => {
  const key = 'sk-test-1234567890-secret-tail';

  it('saves a key, reports only a hint, and removes it again', async () => {
    const saved = await app.request('/api/settings/ai/keys/anthropic', {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ apiKey: `  ${key}  ` }),
    });
    expect(saved.status).toBe(200);
    const raw = await saved.text();
    expect(raw).not.toContain(key);
    expect(raw).not.toContain('secret');

    const anthropic = aiSettingsSchema
      .parse(JSON.parse(raw))
      .providers.find((entry) => entry.provider === 'anthropic');
    expect(anthropic).toEqual({
      provider: 'anthropic',
      configured: true,
      source: 'settings',
      hint: 'tail',
    });
    expect(providerApiKey(db, 'anthropic', noEnvKeys)).toBe(key);

    const removed = await app.request('/api/settings/ai/keys/anthropic', { method: 'DELETE' });
    expect(removed.status).toBe(200);
    expect(providerApiKey(db, 'anthropic', noEnvKeys)).toBe('');
  });

  it('keeps saved keys out of the JSON export', async () => {
    setProviderKey(db, 'mistral', key, noEnvKeys);

    const exported = await app.request('/api/export?format=json');
    expect(exported.status).toBe(200);
    expect(await exported.text()).not.toContain(key);
  });

  it('rejects an unknown provider, an empty key and a key with spaces', async () => {
    const unknown = await app.request('/api/settings/ai/keys/cohere', {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ apiKey: key }),
    });
    expect(unknown.status).toBe(400);

    for (const apiKey of ['   ', 'two words']) {
      const response = await app.request('/api/settings/ai/keys/openai', {
        method: 'PUT',
        headers: json,
        body: JSON.stringify({ apiKey }),
      });
      expect(response.status).toBe(400);
    }
  });

  it('accepts the new providers for a feature', async () => {
    const { response, body } = await put({
      features: [{ feature: 'chat', provider: 'qwen', model: 'qwen-plus' }],
    });
    expect(response.status).toBe(200);
    expect(aiSettingsSchema.parse(body).features[5]).toMatchObject({
      provider: 'qwen',
      model: 'qwen-plus',
    });
  });
});
