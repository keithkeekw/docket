import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  DATABASE_PATH: z.string().min(1).default('./data/app.db'),
});

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
  deepseekApiKey: process.env.DEEPSEEK_API_KEY?.trim() ?? '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY?.trim() ?? '',
};
