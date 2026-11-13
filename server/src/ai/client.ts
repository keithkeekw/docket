import OpenAI from 'openai';
import type { AiFeature, AiProvider } from '@app/shared';
import { eq } from 'drizzle-orm';
import { aiSettings } from '../db/schema';
import type { Db } from '../db/types';
import { env } from '../env';
import { ServiceError } from '../lib/errors';

/** TECHSTACK §6.1 base URLs, overridable for a proxy or a test stub (D51). */
const BASE_URLS: Record<AiProvider, string> = {
  deepseek: env.deepseekBaseUrl,
  openrouter: env.openrouterBaseUrl,
};

const API_KEYS: Record<AiProvider, string> = {
  deepseek: env.deepseekApiKey,
  openrouter: env.openrouterApiKey,
};

export type FeatureConfig = {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseURL: string;
};

/** Null when the feature has no provider/model or that provider has no key. */
export function featureConfig(db: Db, feature: AiFeature): FeatureConfig | null {
  const row = db.select().from(aiSettings).where(eq(aiSettings.feature, feature)).get();
  if (!row) return null;

  const apiKey = API_KEYS[row.provider];
  if (!apiKey) return null;

  return { provider: row.provider, model: row.model, apiKey, baseURL: BASE_URLS[row.provider] };
}

/** FR-26: the app says clearly when AI cannot run, rather than failing oddly. */
export function requireFeatureConfig(db: Db, feature: AiFeature): FeatureConfig {
  const config = featureConfig(db, feature);
  if (!config) {
    throw new ServiceError(
      'AI is not set up for this yet. Add a provider and model in Settings, and a key in .env.',
      503,
    );
  }

  return config;
}

export type CompletionRequest = {
  feature: AiFeature;
  system: string;
  user: string;
};

export type CompletionResult = { text: string; model: string };

/** Injected in tests so no request ever leaves the machine (NFR-9). */
export type Completion = (request: CompletionRequest) => Promise<CompletionResult>;

export function makeCompletion(db: Db): Completion {
  return async (request) => {
    const config = requireFeatureConfig(db, request.feature);
    const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

    let text: string;
    try {
      // No `response_format`: support varies by provider and model (TECHSTACK
      // §6.2 allows the "JSON only" instruction instead).
      const response = await client.chat.completions.create({
        model: config.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
      });

      text = response.choices[0]?.message?.content ?? '';
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message.slice(0, 200) : 'unknown error';
      throw new ServiceError(`The AI provider could not complete the request: ${detail}`, 502);
    }

    if (!text.trim()) {
      throw new ServiceError('The model returned an empty answer. Nothing was saved.', 502);
    }

    return { text, model: config.model };
  };
}

/**
 * Models wrap JSON in prose or fences often enough that stripping is part of
 * parsing, not a nicety (TECHSTACK §6.2 step 3).
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
