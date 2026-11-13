import { format, isBefore, isValid, parse, startOfDay, type Locale } from 'date-fns';
import { enUS } from 'date-fns/locale';

export type DueDescription = {
  /** DESIGN §4: "10:00" (today with time), "Today", "Mon 16 Nov". */
  label: string;
  /** Absolute form for the tooltip and screen readers, e.g. "Sat 14 Nov, 14:00". */
  absolute: string;
  overdue: boolean;
};

type DescribeDueOptions = {
  /** date-fns locale for weekday and month names. */
  locale?: Locale;
  /** Word used when the due date is today and has no time. */
  todayLabel?: string;
};

/**
 * Due dates are local calendar dates (`YYYY-MM-DD`) and optional local times
 * (`HH:mm`) — see PROGRESS D17.
 *
 * A date-only task is overdue only after its day has ended; a task with a time
 * is overdue once that moment has passed.
 */
export function describeDue(
  dueDate: string,
  dueTime: string | null = null,
  now: Date = new Date(),
  options: DescribeDueOptions = {},
): DueDescription {
  const locale = options.locale ?? enUS;
  const todayLabel = options.todayLabel ?? 'Today';
  const day = parse(dueDate, 'yyyy-MM-dd', now);

  if (!isValid(day)) {
    return { label: dueDate, absolute: dueDate, overdue: false };
  }

  const time = dueTime && /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : null;
  const moment = time ? parse(`${dueDate} ${time}`, 'yyyy-MM-dd HH:mm', now) : null;
  const validMoment = moment && isValid(moment) ? moment : null;

  const overdue = validMoment ? isBefore(validMoment, now) : isBefore(day, startOfDay(now));

  const isToday = format(day, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  const label = isToday
    ? validMoment
      ? format(validMoment, 'HH:mm')
      : todayLabel
    : format(day, 'EEE d MMM', { locale });

  return {
    label,
    absolute: validMoment
      ? format(validMoment, 'EEE d MMM, HH:mm', { locale })
      : format(day, 'EEE d MMM', { locale }),
    overdue,
  };
}
