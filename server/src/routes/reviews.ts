import { generateReviewBodySchema } from '@app/shared';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { invalidBody, readJson } from '../lib/http';
import { generateReview, listReviews, openReview } from '../services/reviews';

export function registerReviewRoutes(app: Hono, db: Db): void {
  app.get('/api/reviews', (c) => c.json({ reviews: listReviews(db) }));

  // Opening is what the "days started from a review" metric counts.
  app.get('/api/reviews/:id', (c) => c.json({ review: openReview(db, c.req.param('id')) }));

  app.post('/api/reviews/generate', async (c) => {
    const parsed = generateReviewBodySchema.safeParse(await readJson(c));
    if (!parsed.success) return invalidBody(c, parsed.error);

    return c.json({ review: await generateReview(db, parsed.data.kind) }, 201);
  });
}
