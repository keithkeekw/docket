import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useTasks } from '../api/tasks';
import { cx } from '../lib/cx';
import { PrelineTooltip } from './PrelineTooltip';
import { useDateLocale, useLocale, useT } from '../lib/i18n';

/**
 * Month view of task due dates. Days with at least one task due are tinted and
 * carry a count; the arrows move between months and refetch that month's tasks.
 */
export function DashboardCalendar() {
  const t = useT();
  const dateLocale = useDateLocale();
  const locale = useLocale();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [now, setNow] = useState(() => new Date());

  // Keep "today" correct if the Dashboard stays open across midnight.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
  // The calendar is a history of due dates, so completed work still counts.
  const tasks = useTasks({ dueFrom: monthStart, dueTo: monthEnd, completed: 'all' });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const counts = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const task of tasks.data?.tasks ?? []) {
      if (!task.dueDate) continue;
      byDate.set(task.dueDate, (byDate.get(task.dueDate) ?? 0) + 1);
    }
    return byDate;
  }, [tasks.data?.tasks]);

  const today = format(now, 'yyyy-MM-dd');

  // Weekday initials follow the interface language instead of a fixed list.
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    format(addDays(weekStart, index), 'EEE', { locale: dateLocale }),
  );

  return (
    <section
      aria-labelledby="dashboard-calendar"
      className="rounded-xl border border-zinc-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="dashboard-calendar" className="text-[15px] font-semibold text-zinc-900">
          {t('Calendar')}
        </h2>

        <div className="flex items-center gap-1">
          <PrelineTooltip label={t('Previous Month')}>
            <button
              type="button"
              aria-label={t('Previous Month')}
              onClick={() => {
                setMonth((current) => subMonths(current, 1));
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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
                d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
                clipRule="evenodd"
              />
            </svg>
            </button>
          </PrelineTooltip>
          <span className="min-w-[7.5rem] text-center text-xs font-medium text-zinc-600">
            {format(month, locale === 'zh' ? 'yyyy年M月' : 'MMMM yyyy', { locale: dateLocale })}
          </span>
          <PrelineTooltip label={t('Next Month')}>
            <button
              type="button"
              aria-label={t('Next Month')}
              onClick={() => {
                setMonth((current) => addMonths(current, 1));
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                clipRule="evenodd"
              />
            </svg>
            </button>
          </PrelineTooltip>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-400">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const date = format(day, 'yyyy-MM-dd');
          const inMonth = day.getMonth() === month.getMonth();
          const count = counts.get(date) ?? 0;

          const isToday = date === today && inMonth;
          const title = [
            isToday ? t('Today') : null,
            count > 0 ? t(count === 1 ? '{count} task due' : '{count} tasks due', { count }) : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <div
              key={date}
              title={title || undefined}
              className={cx(
                'relative flex min-h-10 flex-col rounded-lg px-1.5 py-1 text-left text-xs sm:min-h-11',
                !inMonth && 'text-zinc-300',
                inMonth && !isToday && 'text-zinc-700',
                isToday && 'bg-blue-600 font-semibold text-white ring-1 ring-blue-600',
                !isToday && count > 0 && inMonth && 'bg-blue-50 ring-1 ring-blue-200',
              )}
            >
              <span>{format(day, 'd')}</span>
              {count > 0 && inMonth && (
                <span
                  className={cx(
                    'mt-auto inline-flex items-center gap-1 text-[10px] font-medium',
                    isToday ? 'text-white/90' : 'text-blue-700',
                  )}
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-zinc-500">
        {t('Highlighted days have tasks due · today is the filled cell.')}
        {tasks.isLoading ? ` ${t('Loading…')}` : ''}
      </p>
    </section>
  );
}
