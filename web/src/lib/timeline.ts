import type { Milestone, Task } from '@app/shared';

type TimelineTask = Pick<Task, 'milestoneId' | 'startDate' | 'endDate'>;
type TimelineMilestone = Pick<
  Milestone,
  'id' | 'name' | 'position' | 'completedAt' | 'done' | 'total'
>;

export interface TimelineRow {
  id: string;
  name: string;
  done: number;
  total: number;
  completed: boolean;
  /** Earliest task start date in the milestone (YYYY-MM-DD). */
  start: string | null;
  /** Latest task end date in the milestone (YYYY-MM-DD). */
  end: string | null;
}

export type Timeline =
  | { status: 'no-milestones' }
  | { status: 'no-start'; firstMilestone: string }
  | {
      status: 'ready';
      /** First milestone's earliest start date; the left edge of the chart. */
      start: string;
      /** Last day drawn on the chart. */
      end: string;
      /** False when no task in the last milestone has an end date yet. */
      hasEnd: boolean;
      rows: TimelineRow[];
    };

function earliest(dates: (string | null)[]): string | null {
  return dates.reduce<string | null>(
    (min, date) => (date && (!min || date < min) ? date : min),
    null,
  );
}

function latest(dates: (string | null)[]): string | null {
  return dates.reduce<string | null>(
    (max, date) => (date && (!max || date > max) ? date : max),
    null,
  );
}

/**
 * The project timeline starts at the first milestone's earliest task start
 * date and runs to the last milestone's latest task end date when there is
 * one. Without a start date in the first milestone there is nothing to anchor
 * the chart to.
 */
export function buildTimeline(milestones: TimelineMilestone[], tasks: TimelineTask[]): Timeline {
  const ordered = [...milestones].sort((a, b) => a.position - b.position);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) return { status: 'no-milestones' };

  const rows: TimelineRow[] = ordered.map((milestone) => {
    const own = tasks.filter((task) => task.milestoneId === milestone.id);
    return {
      id: milestone.id,
      name: milestone.name,
      done: milestone.done,
      total: milestone.total,
      completed: milestone.completedAt !== null,
      start: earliest(own.map((task) => task.startDate)),
      end: latest(own.map((task) => task.endDate)),
    };
  });

  const start = rows[0]?.start ?? null;
  if (!start) return { status: 'no-start', firstMilestone: first.name };

  const lastEnd = rows[rows.length - 1]?.end ?? null;
  const furthest =
    latest([start, lastEnd, ...rows.flatMap((row) => [row.start, row.end])]) ?? start;

  return { status: 'ready', start, end: furthest, hasEnd: lastEnd !== null, rows };
}
