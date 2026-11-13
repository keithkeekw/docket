import { restoreBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import {
  createBackup,
  defaultBackupsDir,
  listBackups,
  readBackup,
  restoreBackup,
} from '../services/backups';

export function registerBackupRoutes(app: Hono, db: Db, dir: string = defaultBackupsDir()): void {
  app.post('/api/backup', async (c) => c.json({ backup: await createBackup(db, dir) }, 201));

  app.get('/api/backups', (c) => c.json({ backups: listBackups(dir) }));

  // Download is a plain link in Settings (PROGRESS D11), not part of the write flow.
  app.get('/api/backups/:file', (c) => {
    const { data, entry } = readBackup(dir, c.req.param('file'));

    c.header('Content-Type', 'application/octet-stream');
    c.header('Content-Disposition', `attachment; filename="${entry.file}"`);
    return c.body(new Uint8Array(data));
  });

  app.post('/api/restore', async (c) => {
    const parsed = restoreBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json(await restoreBackup(db, parsed.data.file, dir));
  });
}
