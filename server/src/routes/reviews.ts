import { generateReviewBodySchema, updateReviewScheduleBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { generateReview, listReviews, openReview } from '../services/reviews';
import { readReviewSchedule, updateReviewSchedule } from '../services/settings';

export function registerReviewRoutes(
  app: Hono,
  db: Db,
  onScheduleChange: () => void = () => {},
): void {
  // Settings → Reviews: whether reviews run on a schedule, and when.
  app.get('/api/settings/reviews', (c) => c.json(readReviewSchedule(db)));

  app.put('/api/settings/reviews', async (c) => {
    const parsed = updateReviewScheduleBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    const schedule = updateReviewSchedule(db, parsed.data);
    onScheduleChange();
    return c.json(schedule);
  });

  app.get('/api/reviews', (c) => c.json({ reviews: listReviews(db) }));

  // Opening is what the "days started from a review" metric counts.
  app.get('/api/reviews/:id', (c) => c.json({ review: openReview(db, c.req.param('id')) }));

  app.post('/api/reviews/generate', async (c) => {
    const parsed = generateReviewBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ review: await generateReview(db, parsed.data.kind) }, 201);
  });
}
