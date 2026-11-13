import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { runUndo, undoLabel } from '../services/undo';

export function registerUndoRoutes(app: Hono, _db: Db): void {
  // FR-29: one slot, exposed so the shell can show what is recoverable.
  app.get('/api/undo', (c) => c.json({ label: undoLabel() }));

  app.post('/api/undo', (c) => {
    const label = runUndo();
    if (!label) return c.json({ error: 'Nothing to undo', label: null }, 409);

    return c.json({ label });
  });
}
