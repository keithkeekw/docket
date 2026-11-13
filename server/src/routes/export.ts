import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { exportJson, exportMarkdown } from '../services/export';

export function registerExportRoutes(app: Hono, db: Db): void {
  // FR-28. A plain GET so Settings can offer it as a download link.
  app.get('/api/export', (c) => {
    const format = c.req.query('format') === 'markdown' ? 'markdown' : 'json';
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'markdown') {
      c.header('Content-Type', 'text/markdown; charset=utf-8');
      c.header('Content-Disposition', `attachment; filename="export-${stamp}.md"`);
      return c.body(exportMarkdown(db));
    }

    c.header('Content-Type', 'application/json; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="export-${stamp}.json"`);
    return c.body(JSON.stringify(exportJson(db), null, 2));
  });
}
