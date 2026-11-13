import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Completion } from '../ai/client';
import { appSettings, projects, reviews, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';
import {
  buildReviewContext,
  generateReview,
  getReview,
  listReviews,
  openReview,
  stripFence,
} from './reviews';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
});

afterEach(() => {
  sqlite.close();
});

const NOW = new Date(2026, 10, 13, 9, 0); // Fri 13 Nov 2026, 09:00 local

function statusId(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`no status ${name}`);
  return row.id;
}

function stubReview(text = '## Friday\n- One thing\n- Another thing'): Completion {
  return async () => ({ text, model: 'stub-model' });
}

describe('buildReviewContext', () => {
  it('aggregates the period, the overdue work and the projects', () => {
    const project = db
      .insert(projects)
      .values({ name: 'Onboarding' })
      .returning()
      .get();
    const open = statusId('To do');
    const done = statusId('Done');

    db.insert(tasks)
      .values([
        {
          title: 'Finished today',
          statusId: done,
          projectId: project.id,
          completedAt: new Date(2026, 10, 13, 8, 0).toISOString(),
          dueDate: '2026-11-13',
        },
        {
          title: 'Finished last month',
          statusId: done,
          completedAt: new Date(2026, 9, 1, 8, 0).toISOString(),
        },
        { title: 'Overdue', statusId: open, dueDate: '2026-11-10' },
        { title: 'Due today', statusId: open, dueDate: '2026-11-13' },
        { title: 'Soon', statusId: open, dueDate: '2026-11-15' },
        { title: 'Later', statusId: open, dueDate: '2026-12-01' },
        { title: 'Undated', statusId: open },
      ])
      .run();

    const context = buildReviewContext(db, 'daily', NOW);

    expect(context).toMatchObject({
      kind: 'daily',
      periodStart: '2026-11-13',
      periodEnd: '2026-11-13',
      counts: { open: 5, overdue: 1, dueToday: 1, inbox: 5, completed: 1 },
    });
    expect(context.completed.map((task) => task.title)).toEqual(['Finished today']);
    expect(context.overdue.map((task) => task.title)).toEqual(['Overdue']);
    expect(context.dueSoon.map((task) => task.title)).toEqual(['Due today', 'Soon']);
    expect(context.projects[0]).toMatchObject({ name: 'Onboarding', percent: 100, done: 1, total: 1 });
  });

  it('uses a seven-day window for a weekly review', () => {
    const context = buildReviewContext(db, 'weekly', NOW);
    expect(context.periodStart).toBe('2026-11-07');
    expect(context.periodEnd).toBe('2026-11-13');
  });

  it('leaves AI-excluded projects out of the context', () => {
    db.insert(projects).values({ name: 'Client secrets', aiExcluded: true }).run();
    db.insert(projects).values({ name: 'Onboarding' }).run();

    const context = buildReviewContext(db, 'daily', NOW);
    expect(context.projects.map((project) => project.name)).toEqual(['Onboarding']);
  });
});

describe('generateReview', () => {
  it('stores the Markdown, the model and the period, and stamps the watermark', async () => {
    const review = await generateReview(db, 'daily', { complete: stubReview(), now: NOW });

    expect(review).toMatchObject({
      kind: 'daily',
      periodStart: '2026-11-13',
      periodEnd: '2026-11-13',
      model: 'stub-model',
      openedAt: null,
    });
    expect(review.contentMd).toContain('## Friday');

    const stamp = db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'last_daily_review_at'))
      .get();
    expect(stamp?.value).toBe(NOW.toISOString());
  });

  it('does not advance the watermark for a manual review', async () => {
    await generateReview(db, 'manual', { complete: stubReview(), now: NOW });

    const stamp = db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'last_daily_review_at'))
      .get();
    expect(stamp).toBeUndefined();
  });

  it('strips a code fence if the model adds one', async () => {
    const review = await generateReview(db, 'daily', {
      complete: stubReview('```markdown\n## Friday\n- Done\n```'),
      now: NOW,
    });

    expect(review.contentMd).toBe('## Friday\n- Done');
  });

  it('fails with 503 when the review feature is not configured', async () => {
    await expect(generateReview(db, 'daily', { now: NOW })).rejects.toMatchObject({ status: 503 });
  });

  it('fails with 502 when the model returns nothing', async () => {
    await expect(
      generateReview(db, 'daily', { complete: stubReview('   '), now: NOW }),
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe('listReviews / openReview', () => {
  it('lists newest first without the body', async () => {
    const first = await generateReview(db, 'daily', { complete: stubReview('## A'), now: NOW });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await generateReview(db, 'weekly', {
      complete: stubReview('## B'),
      now: new Date(2026, 10, 13, 10, 0),
    });

    const list = listReviews(db);
    expect(list.map((review) => review.kind)).toEqual(['weekly', 'daily']);
    expect(list.every((review) => !('contentMd' in review))).toBe(true);
    expect(list.some((review) => review.id === first.id)).toBe(true);
  });

  it('marks a review opened once', async () => {
    const review = await generateReview(db, 'daily', { complete: stubReview(), now: NOW });

    const opened = openReview(db, review.id);
    expect(opened.openedAt).not.toBeNull();

    const again = openReview(db, review.id);
    expect(again.openedAt).toBe(opened.openedAt);
    expect(getReview(db, review.id).openedAt).toBe(opened.openedAt);
    expect(db.select().from(reviews).all()).toHaveLength(1);
  });

  it('returns 404 for an unknown review', () => {
    expect(() => getReview(db, 'missing')).toThrow(/not found/);
  });
});

describe('stripFence', () => {
  it('leaves plain Markdown alone', () => {
    expect(stripFence('## Hi\n- one')).toBe('## Hi\n- one');
  });
});
