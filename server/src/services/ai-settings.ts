import type { AiFeature, AiSettings, AiProvider, UpdateAiSettingsBody } from '@app/shared';
import { eq } from 'drizzle-orm';
import { aiSettings } from '../db/schema';
import type { Db } from '../db/types';
import { env } from '../env';
import { ServiceError } from '../lib/errors';

/** Fixed display order — the settings screen renders these five rows always. */
const FEATURE_ORDER: readonly AiFeature[] = [
  'capture',
  'breakdown',
  'review_daily',
  'review_weekly',
  'chat',
];

const PROVIDER_ORDER: readonly AiProvider[] = ['deepseek', 'openrouter'];

type Keys = Record<AiProvider, string>;

function envKeys(): Keys {
  return { deepseek: env.deepseekApiKey, openrouter: env.openrouterApiKey };
}

/**
 * `GET /api/settings/ai`. Keys are read from `.env` and only their presence is
 * reported — NFR-2 forbids ever sending them back (PROGRESS D48).
 */
export function getAiSettings(db: Db, keys: Keys = envKeys()): AiSettings {
  const rows = db.select().from(aiSettings).all();
  const byFeature = new Map(rows.map((row) => [row.feature, row]));

  return {
    providers: PROVIDER_ORDER.map((provider) => ({
      provider,
      configured: keys[provider].trim() !== '',
    })),
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

/**
 * `PUT /api/settings/ai` replaces only the features in the body; `null` clears
 * one. Provider and model must be set together, so a feature is either fully
 * configured or explicitly off (FR-26).
 */
export function updateAiSettings(
  db: Db,
  body: UpdateAiSettingsBody,
  keys: Keys = envKeys(),
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

  return getAiSettings(db, keys);
}
