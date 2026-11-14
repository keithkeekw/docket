import type { Milestone } from '@app/shared';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useTasks } from '../api/tasks';
import { cx } from '../lib/cx';
import { useDateLocale, useLocale, useT } from '../lib/i18n';
import { buildTimeline, type TimelineRow } from '../lib/timeline';
import { localDateString } from '../lib/today';
import { PrelineTooltip } from './PrelineTooltip';

/** Short spans still get a readable chart instead of a few very wide bars. */
const MIN_SPAN_DAYS = 7;
/** The chart grows with the number of days it covers; the dialog wraps it. */
const PX_PER_DAY = 14;
const MIN_TRACK_PX = 320;
const MAX_TRACK_PX = 1600;
const TICK_SPACING_PX = 110;
/** Matches the `w-40` milestone name column. */
const LABEL_PX = 160;
/** Dialog margin, border and body padding, so a long chart fits on screen. */
const VIEWPORT_GUTTER_PX = 76;
/** Narrower bars show their dates beside the bar instead of inside it. */
const LABEL_INSIDE_PX = 104;

const FOOTER_BUTTON =
  'inline-flex size-10 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Overlay chart of every milestone in a project, placed by the planned start
 * and end dates of its tasks. Completed tasks count, so finished milestones
 * keep their place on the chart.
 */
export function ProjectTimelineDialog({
  projectId,
  milestones,
  onClose,
}: {
  projectId: string;
  milestones: Milestone[];
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const dateLocale = useDateLocale();
  const tasks = useTasks({ project: projectId, completed: 'all' });

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const okRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    okRef.current?.focus();
  }, []);

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose();
  }

  const shortDate = (date: string) =>
    format(parseISO(date), locale === 'zh' ? 'M月d日' : 'd MMM', { locale: dateLocale });
  const longDate = (date: string) =>
    format(parseISO(date), locale === 'zh' ? 'yyyy年M月d日' : 'd MMM yyyy', {
      locale: dateLocale,
    });

  const timeline = tasks.data ? buildTimeline(milestones, tasks.data.tasks) : null;

  let subtitle = t('Milestones placed by the planned start and end dates of their tasks.');
  if (timeline?.status === 'ready') {
    subtitle = timeline.hasEnd
      ? t('{start} to {end}', { start: longDate(timeline.start), end: longDate(timeline.end) })
      : t('From {start}', { start: longDate(timeline.start) });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="timeline-title"
      className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-fit max-w-[calc(100vw-2rem)] min-w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 id="timeline-title" className="text-[15px] font-semibold text-zinc-900">
          {t('Project Timeline')}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      </div>

      <div className="max-h-[calc(100dvh-12rem)] overflow-auto overscroll-contain px-5 py-5">
        {tasks.error ? (
          <p className="text-sm text-red-700">{tasks.error.message}</p>
        ) : !timeline ? (
          <p className="text-sm text-zinc-500">{t('Loading…')}</p>
        ) : timeline.status === 'no-milestones' ? (
          <TimelineMessage>
            {t('This project has no milestones yet, so there is no timeline to show.')}
          </TimelineMessage>
        ) : timeline.status === 'no-start' ? (
          <TimelineMessage>
            {t(
              'Unable to show the timeline: no task in the first milestone, “{name}”, has a start date. Add a start date to one of its tasks and try again.',
              { name: timeline.firstMilestone },
            )}
          </TimelineMessage>
        ) : (
          <TimelineChart
            start={timeline.start}
            end={timeline.end}
            hasEnd={timeline.hasEnd}
            rows={timeline.rows}
            shortDate={shortDate}
          />
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3">
        <PrelineTooltip label={t('Cancel')}>
          <button
            type="button"
            aria-label={t('Cancel')}
            className={cx(
              FOOTER_BUTTON,
              'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
            )}
            onClick={onClose}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </PrelineTooltip>
        <PrelineTooltip label={t('OK')}>
          <button
            ref={okRef}
            type="button"
            aria-label={t('OK')}
            className={cx(FOOTER_BUTTON, 'bg-zinc-900 text-white hover:bg-zinc-800')}
            onClick={onClose}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </PrelineTooltip>
      </div>
    </dialog>
  );
}

function TimelineMessage({ children }: { children: string }) {
  return (
    <p className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
      {children}
    </p>
  );
}

function TimelineChart({
  start,
  end,
  hasEnd,
  rows,
  shortDate,
}: {
  start: string;
  end: string;
  hasEnd: boolean;
  rows: TimelineRow[];
  shortDate: (date: string) => string;
}) {
  const t = useT();
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);
  const origin = parseISO(start);
  const span = Math.max(differenceInCalendarDays(parseISO(end), origin) + 1, MIN_SPAN_DAYS);

  /** Days from the chart start, as a percentage of the track width. */
  const offset = (date: string) => (differenceInCalendarDays(parseISO(date), origin) / span) * 100;
  const dateAt = (days: number) =>
    localDateString(new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + days));

  const fitWidth = viewportWidth - VIEWPORT_GUTTER_PX - LABEL_PX;
  const trackWidth = Math.max(Math.min(span * PX_PER_DAY, MAX_TRACK_PX, fitWidth), MIN_TRACK_PX);
  const tickCount = Math.min(Math.max(Math.round(trackWidth / TICK_SPACING_PX), 2), span - 1);
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const days = Math.round(((span - 1) * index) / tickCount);
    return { date: dateAt(days), left: ((days + 0.5) / span) * 100 };
  });

  const today = localDateString();
  const todayOffset = offset(today);
  const showToday = todayOffset >= 0 && todayOffset < 100;

  return (
    <div style={{ width: LABEL_PX + trackWidth }}>
      <div>
        <div className="flex">
          <div className="w-40 shrink-0" />
          <div className="relative h-5 flex-1 text-[11px] text-zinc-500">
            {ticks.map((tick, index) => (
              <span
                key={tick.date}
                className={cx(
                  'absolute top-0 whitespace-nowrap',
                  index === 0 ? '' : index === tickCount ? '-translate-x-full' : '-translate-x-1/2',
                )}
                style={{ left: index === 0 ? 0 : index === tickCount ? '100%' : `${tick.left}%` }}
              >
                {shortDate(tick.date)}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 right-0 left-40">
            {ticks.map((tick) => (
              <div
                key={tick.date}
                className="absolute inset-y-0 border-l border-dashed border-zinc-200"
                style={{ left: `${tick.left}%` }}
              />
            ))}
            {showToday && (
              <div
                className="absolute inset-y-0 border-l-2 border-blue-500"
                style={{
                  left: `${((differenceInCalendarDays(parseISO(today), origin) + 0.5) / span) * 100}%`,
                }}
              >
                <span className="absolute -top-1 left-1 rounded bg-blue-500 px-1 text-[10px] font-medium text-white">
                  {t('Today')}
                </span>
              </div>
            )}
          </div>

          <ol className="relative">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center border-t border-zinc-100 py-2.5 first:border-t-0"
              >
                <div className="w-40 shrink-0 pr-3">
                  <p className="truncate text-sm font-medium text-zinc-900" title={row.name}>
                    {row.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {t('{done} of {total} tasks', { done: row.done, total: row.total })}
                  </p>
                </div>
                <div className="relative h-7 flex-1">
                  <MilestoneBar
                    row={row}
                    offset={offset}
                    span={span}
                    trackWidth={trackWidth}
                    shortDate={shortDate}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>

        {!hasEnd && (
          <p className="mt-3 text-xs text-zinc-500">
            {t(
              'No task in the last milestone has an end date yet, so the chart stops at the latest planned date.',
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function MilestoneBar({
  row,
  offset,
  span,
  trackWidth,
  shortDate,
}: {
  row: TimelineRow;
  offset: (date: string) => number;
  span: number;
  trackWidth: number;
  shortDate: (date: string) => string;
}) {
  const t = useT();
  const color = row.completed ? 'bg-emerald-500' : 'bg-zinc-800';

  if (!row.start && !row.end) {
    return (
      <p className="flex h-full items-center text-xs text-zinc-400 italic">
        {t('No planned dates')}
      </p>
    );
  }

  if (row.start && row.end && row.end >= row.start) {
    const left = offset(row.start);
    const width = offset(row.end) - left + 100 / span;
    const label = `${shortDate(row.start)} – ${shortDate(row.end)}`;
    const fitsLabel = (width / 100) * trackWidth >= LABEL_INSIDE_PX;
    const labelOnLeft = left + width > 70;
    return (
      <div
        className={cx(
          'absolute top-1/2 flex h-5 -translate-y-1/2 items-center rounded-md px-2',
          color,
        )}
        style={{ left: `${left}%`, width: `${width}%` }}
        title={`${row.name}: ${label}`}
      >
        <span
          className={cx(
            'text-[11px] font-medium whitespace-nowrap',
            fitsLabel
              ? 'truncate text-white'
              : cx(
                  'absolute text-zinc-600',
                  labelOnLeft ? 'right-full mr-1.5' : 'left-full ml-1.5',
                ),
          )}
        >
          {label}
        </span>
      </div>
    );
  }

  // Only one planned date (or an end before the start): mark that day.
  const date = row.end ?? row.start ?? '';
  const label = row.end
    ? t('Ends {date}', { date: shortDate(date) })
    : t('Starts {date}', { date: shortDate(date) });
  const position = offset(date) + 50 / span;
  const nearRightEdge = position > 70;
  return (
    <div
      className={cx(
        'absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5',
        nearRightEdge && 'flex-row-reverse',
      )}
      style={
        nearRightEdge
          ? { right: `calc(${100 - position}% - 6px)` }
          : { left: `calc(${position}% - 6px)` }
      }
      title={`${row.name}: ${label}`}
    >
      <span className={cx('size-3 rotate-45 rounded-[2px]', color)} />
      <span className="text-[11px] whitespace-nowrap text-zinc-600">{label}</span>
    </div>
  );
}
