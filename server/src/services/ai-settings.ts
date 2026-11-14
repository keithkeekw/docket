import {
  AI_PROVIDERS,
  type AiFeature,
  type AiProvider,
  type AiSettings,
  type UpdateAiSettingsBody,
} from '@app/shared';
import { eq } from 'drizzle-orm';
import { aiSettings, appSettings } from '../db/schema';
import type { Db } from '../db/types';
import { env } from '../env';
import { ServiceError } from '../lib/errors';

/** Fixed display order — the settings screen renders these six rows always. */
const FEATURE_ORDER: readonly AiFeature[] = [
  'capture',
  'breakdown',
  'summarize',
  'review_daily',
  'review_weekly',
  'chat',
];

type Keys = Record<AiProvider, string>;

type ResolvedKey = { key: string; source: 'settings' | 'env' | null };

/** Keys pasted into Settings → AI live in `app_settings`, one row per provider. */
export const AI_KEY_PREFIX = 'ai_key:';

function keySetting(provider: AiProvider): string {
  return `${AI_KEY_PREFIX}${provider}`;
}

function savedKeys(db: Db): Partial<Keys> {
  const saved: Partial<Keys> = {};
  for (const row of db.select().from(appSettings).all()) {
    if (!row.key.startsWith(AI_KEY_PREFIX)) continue;
    const provider = row.key.slice(AI_KEY_PREFIX.length) as AiProvider;
    if (AI_PROVIDERS.includes(provider) && row.value.trim()) saved[provider] = row.value.trim();
  }
  return saved;
}

/** A key saved in Settings wins over the `.env` fallback. */
function resolveKeys(db: Db, envKeys: Keys): Record<AiProvider, ResolvedKey> {
  const saved = savedKeys(db);

  return Object.fromEntries(
    AI_PROVIDERS.map((provider) => {
      const fromSettings = saved[provider];
      if (fromSettings) return [provider, { key: fromSettings, source: 'settings' }];

      const fromEnv = envKeys[provider].trim();
      return [provider, fromEnv ? { key: fromEnv, source: 'env' } : { key: '', source: null }];
    }),
  ) as Record<AiProvider, ResolvedKey>;
}

/** Empty string when the provider has no key anywhere. */
export function providerApiKey(db: Db, provider: AiProvider, envKeys: Keys = env.apiKeys): string {
  return resolveKeys(db, envKeys)[provider].key;
}

/**
 * `GET /api/settings/ai`. Only presence, source and the last four characters
 * of each key are reported — NFR-2 forbids ever sending a key back (D48).
 */
export function getAiSettings(db: Db, envKeys: Keys = env.apiKeys): AiSettings {
  const rows = db.select().from(aiSettings).all();
  const byFeature = new Map(rows.map((row) => [row.feature, row]));
  const keys = resolveKeys(db, envKeys);

  return {
    providers: AI_PROVIDERS.map((provider) => {
      const { key, source } = keys[provider];

      return {
        provider,
        configured: source !== null,
        source,
        hint: key.length >= 12 ? key.slice(-4) : null,
      };
    }),
    features: FEATURE_ORDER.map((feature) => {
      const row = byFeature.get(feature);

      return {
        feature,
        provider: row?.provider ?? null,
        model: row?.model ?? null,
      };
    }),
  };
}

/** `PUT /api/settings/ai/keys/:provider` — stored locally, takes effect immediately. */
export function setProviderKey(
  db: Db,
  provider: AiProvider,
  apiKey: string,
  envKeys: Keys = env.apiKeys,
): AiSettings {
  db.insert(appSettings)
    .values({ key: keySetting(provider), value: apiKey })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: apiKey } })
    .run();

  return getAiSettings(db, envKeys);
}

/** `DELETE /api/settings/ai/keys/:provider` — falls back to `.env`, if it has one. */
export function clearProviderKey(
  db: Db,
  provider: AiProvider,
  envKeys: Keys = env.apiKeys,
): AiSettings {
  db.delete(appSettings)
    .where(eq(appSettings.key, keySetting(provider)))
    .run();
  return getAiSettings(db, envKeys);
}

/**
 * `PUT /api/settings/ai` replaces only the features in the body; `null` clears
 * one. Provider and model must be set together, so a feature is either fully
 * configured or explicitly off (FR-26).
 */
export function updateAiSettings(
  db: Db,
  body: UpdateAiSettingsBody,
  envKeys: Keys = env.apiKeys,
): AiSettings {
  for (const entry of body.features) {
    if ((entry.provider === null) !== (entry.model === null)) {
      throw new ServiceError('Choose a provider and a model, or neither', 400);
    }
  }

  db.transaction(() => {
    for (const entry of body.features) {
      if (entry.provider === null || entry.model === null) {
        db.delete(aiSettings).where(eq(aiSettings.feature, entry.feature)).run();
        continue;
      }

      db.insert(aiSettings)
        .values({ feature: entry.feature, provider: entry.provider, model: entry.model })
        .onConflictDoUpdate({
          target: aiSettings.feature,
          set: { provider: entry.provider, model: entry.model },
        })
        .run();
    }
  });

  return getAiSettings(db, envKeys);
}
