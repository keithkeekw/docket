import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AiProvider } from '@app/shared';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * `server/src/env.ts` → two levels up is the repository root. npm workspaces run
 * scripts with the workspace directory as cwd, so paths from `.env` are resolved
 * against the repo root rather than `server/`.
 */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

loadDotenv({ path: path.join(REPO_ROOT, '.env'), quiet: true });

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(9000),
  DATABASE_PATH: z.string().min(1).default('./data/app.db'),
  // Optional provider overrides (PROGRESS D51): a proxy, or a stub in tests.
  DEEPSEEK_BASE_URL: z.string().url().optional(),
  OPENROUTER_BASE_URL: z.string().url().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  GEMINI_BASE_URL: z.string().url().optional(),
  ANTHROPIC_BASE_URL: z.string().url().optional(),
  MISTRAL_BASE_URL: z.string().url().optional(),
  QWEN_BASE_URL: z.string().url().optional(),
});

function envKey(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const env = {
  port: parsed.data.PORT,
  databasePath: path.resolve(REPO_ROOT, parsed.data.DATABASE_PATH),
  /** Fallback keys; a key saved in Settings → AI takes precedence. */
  apiKeys: {
    deepseek: envKey('DEEPSEEK_API_KEY'),
    openrouter: envKey('OPENROUTER_API_KEY'),
    openai: envKey('OPENAI_API_KEY'),
    gemini: envKey('GEMINI_API_KEY', 'GOOGLE_API_KEY'),
    anthropic: envKey('ANTHROPIC_API_KEY'),
    mistral: envKey('MISTRAL_API_KEY'),
    qwen: envKey('QWEN_API_KEY', 'DASHSCOPE_API_KEY'),
  } satisfies Record<AiProvider, string>,
  /** Every provider is reached through its OpenAI-compatible endpoint. */
  baseUrls: {
    deepseek: parsed.data.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    openrouter: parsed.data.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    openai: parsed.data.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    gemini:
      parsed.data.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai/',
    anthropic: parsed.data.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1/',
    mistral: parsed.data.MISTRAL_BASE_URL ?? 'https://api.mistral.ai/v1',
    // International (Singapore) endpoint; mainland China accounts set
    // QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1.
    qwen: parsed.data.QWEN_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  } satisfies Record<AiProvider, string>,
};
