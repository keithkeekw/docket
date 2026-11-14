import type { Review, ReviewSummary } from '@app/shared';
import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { makeCompletion, type Completion } from '../ai/client';
import { loadPrompt } from '../ai/prompts';
import { projects, reviews, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { localDateString, localDayLabel } from '../lib/dates';
import { ServiceError } from '../lib/errors';
import { listProjects } from './projects';
import { setAppSetting } from './settings';

type ReviewKind = 'daily' | 'weekly' | 'manual';

const WEEK_DAYS = 7;
const DUE_SOON_DAYS = 7;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Models sometimes wrap Markdown in a fence even when asked not to. */
export function stripFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```$/i);
  return match?.[1] ?? trimmed;
}

type NamedTask = { title: string; project: string | null; date: string | null };

/**
 * Everything the model is allowed to see (TECHSTACK §6.3): names, dates and
 * counts only — no notes, and projects excluded from AI are left out (FR-25).
 */
export type ReviewContext = {
  kind: ReviewKind;
  today: string;
  periodStart: string;
  periodEnd: string;
  /** Heading text the model copies, so it never has to work out a weekday. */
  periodLabel: string;
  counts: { open: number; overdue: number; dueToday: number; inbox: number; completed: number };
  completed: NamedTask[];
  overdue: NamedTask[];
  dueSoon: NamedTask[];
  projects: Array<{
    name: string;
    percent: number;
    done: number;
    total: number;
    currentMilestone: string | null;
    nextDueTask: string | null;
  }>;
};

function periodFor(kind: ReviewKind, now: Date): { periodStart: string; periodEnd: string } {
  const periodEnd = localDateString(now);
  const periodStart =
    kind === 'weekly' ? localDateString(addDays(now, -(WEEK_DAYS - 1))) : periodEnd;

  return { periodStart, periodEnd };
}

export function buildReviewContext(
  db: Db,
  kind: ReviewKind,
  now: Date = new Date(),
): ReviewContext {
  const { periodStart, periodEnd } = periodFor(kind, now);
  const today = localDateString(now);
  const soon = localDateString(addDays(now, DUE_SOON_DAYS));

  const completed = db
    .select({ title: tasks.title, project: projects.name, date: tasks.completedAt })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        isNotNull(tasks.completedAt),
        sql`date(${tasks.completedAt}, 'localtime') between ${periodStart} and ${periodEnd}`,
      ),
    )
    .orderBy(desc(tasks.completedAt))
    .all();

  const overdue = db
    .select({ title: tasks.title, project: projects.name, date: tasks.dueDate })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(isNull(tasks.completedAt), isNotNull(tasks.dueDate), sql`${tasks.dueDate} < ${today}`),
    )
    .orderBy(asc(tasks.dueDate))
    .all();

  const dueSoon = db
    .select({ title: tasks.title, project: projects.name, date: tasks.dueDate })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        isNull(tasks.completedAt),
        isNotNull(tasks.dueDate),
        sql`${tasks.dueDate} >= ${today} and ${tasks.dueDate} <= ${soon}`,
      ),
    )
    .orderBy(asc(tasks.dueDate))
    .all();

  const countsRow = db
    .select({
      open: sql<number>`count(*)`,
      overdue: sql<number>`coalesce(sum(case when ${tasks.dueDate} is not null and ${tasks.dueDate} < ${today} then 1 else 0 end), 0)`,
      dueToday: sql<number>`coalesce(sum(case when ${tasks.dueDate} = ${today} then 1 else 0 end), 0)`,
      inbox: sql<number>`coalesce(sum(case when ${tasks.projectId} is null then 1 else 0 end), 0)`,
    })
    .from(tasks)
    .where(isNull(tasks.completedAt))
    .get();

  const activeProjects = listProjects(db).filter((project) => !project.aiExcluded);

  const periodLabel =
    kind === 'weekly'
      ? `${localDayLabel(addDays(now, -(WEEK_DAYS - 1)))} – ${localDayLabel(now)}`
      : localDayLabel(now);

  return {
    kind,
    today,
    periodStart,
    periodEnd,
    periodLabel,
    counts: {
      open: Number(countsRow?.open ?? 0),
      overdue: Number(countsRow?.overdue ?? 0),
      dueToday: Number(countsRow?.dueToday ?? 0),
      inbox: Number(countsRow?.inbox ?? 0),
      completed: completed.length,
    },
    completed: completed.map((task) => ({ ...task, date: task.date?.slice(0, 10) ?? null })),
    overdue: overdue.map((task) => ({ title: task.title, project: task.project, date: task.date })),
    dueSoon: dueSoon.map((task) => ({ title: task.title, project: task.project, date: task.date })),
    projects: activeProjects.map((project) => ({
      name: project.name,
      percent: project.progress.percent,
      done: project.progress.done,
      total: project.progress.total,
      currentMilestone: project.progress.currentMilestone?.name ?? null,
      nextDueTask: project.progress.nextDueTask?.title ?? null,
    })),
  };
}

function toReview(row: typeof reviews.$inferSelect): Review {
  return {
    id: row.id,
    kind: row.kind,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    contentMd: row.contentMd,
    model: row.model,
    createdAt: row.createdAt,
    openedAt: row.openedAt,
  };
}

/**
 * Generates and stores a review (FR-19, FR-21). Reviews are read-only Markdown —
 * they never go through the proposal flow (TECHSTACK §6.3).
 */
export async function generateReview(
  db: Db,
  kind: ReviewKind,
  options: { complete?: Completion; now?: Date } = {},
): Promise<Review> {
  const feature = kind === 'weekly' ? 'review_weekly' : 'review_daily';
  const complete = options.complete ?? makeCompletion(db);
  const now = options.now ?? new Date();
  const context = buildReviewContext(db, kind, now);

  const { text, model } = await complete({
    feature,
    system: loadPrompt(db, 'review'),
    user: JSON.stringify(context, null, 2),
  });

  const contentMd = stripFence(text).trim();
  if (!contentMd) throw new ServiceError('The model returned an empty review.', 502);

  const inserted = db
    .insert(reviews)
    .values({
      kind,
      periodStart: context.periodStart,
      periodEnd: context.periodEnd,
      contentMd,
      model,
    })
    .returning()
    .get();

  // Only scheduled kinds advance the schedule watermark; a manual review must
  // not make the app think today's automatic review already happened.
  if (kind !== 'manual') {
    setAppSetting(
      db,
      kind === 'daily' ? 'last_daily_review_at' : 'last_weekly_review_at',
      now.toISOString(),
    );
  }

  return toReview(inserted);
}

export function listReviews(db: Db): ReviewSummary[] {
  return db
    .select({
      id: reviews.id,
      kind: reviews.kind,
      periodStart: reviews.periodStart,
      periodEnd: reviews.periodEnd,
      model: reviews.model,
      createdAt: reviews.createdAt,
      openedAt: reviews.openedAt,
    })
    .from(reviews)
    .orderBy(desc(reviews.createdAt))
    .all();
}

export function getReview(db: Db, id: string): Review {
  const row = db.select().from(reviews).where(eq(reviews.id, id)).get();
  if (!row) throw new ServiceError('Review not found', 404);
  return toReview(row);
}

/** Marks the first read, which is the PRD's "days started from a review" metric. */
export function openReview(db: Db, id: string): Review {
  const review = getReview(db, id);
  if (review.openedAt) return review;

  db.update(reviews).set({ openedAt: new Date().toISOString() }).where(eq(reviews.id, id)).run();

  return getReview(db, id);
}
