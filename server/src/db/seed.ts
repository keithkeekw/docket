import { sql } from 'drizzle-orm';
import { db, sqlite } from './client';
import { seedAppSettings, seedStatuses } from './seed-data';
import { statuses } from './schema';

try {
  const statusesAdded = seedStatuses(db);
  const settingsAdded = seedAppSettings(db);

  const total = db
    .select({ count: sql<number>`count(*)` })
    .from(statuses)
    .get();

  console.log(
    `Seed complete: +${statusesAdded} status(es), +${settingsAdded} setting(s); ` +
      `${total?.count ?? 0} status(es) in the database.`,
  );
} catch (error) {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  sqlite.close();
}
