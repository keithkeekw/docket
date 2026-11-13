import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { getDashboard } from '../services/dashboard';

export function registerDashboardRoutes(app: Hono, db: Db): void {
  // DESIGN §5.1 lands here; the review card stays empty until M3.
  app.get('/api/dashboard', (c) => c.json(getDashboard(db)));
}
