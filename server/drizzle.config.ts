import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

// Config lives in `server/`, so resolve the database from the repo root rather
// than the workspace cwd.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(repoRoot, 'data', 'app.db'),
  },
  strict: true,
  verbose: true,
});
