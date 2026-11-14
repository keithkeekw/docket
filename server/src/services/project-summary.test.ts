import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { projects } from '../db/schema';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';
import { generateProjectSummary } from './project-summary';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
});

afterEach(() => {
  sqlite.close();
});

describe('generateProjectSummary', () => {
  it('refuses a project excluded from AI before anything is sent', async () => {
    const row = db
      .insert(projects)
      .values({ name: 'Client secrets', aiExcluded: true })
      .returning()
      .get();

    await expect(generateProjectSummary(db, row.id)).rejects.toMatchObject({
      status: 400,
      message: 'That project is excluded from AI.',
    });
  });
});
