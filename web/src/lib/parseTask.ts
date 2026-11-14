import type { Priority } from '@app/shared';
import { addDays, addMonths, addWeeks, addYears, format, startOfDay } from 'date-fns';

export type ParsedTaskInput = {
  title: string;
  priority?: Priority;
  dueDate?: string;
  dueTime?: string;
  /** RFC 5545 string understood by the server's recurrence service. */
  recurrenceRule?: string;
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const asDate = (date: Date): string => format(date, 'yyyy-MM-dd');

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function weekdayOnOrAfter(now: Date, weekday: number, forceNext = false): Date {
  const delta = (weekday - now.getDay() + 7) % 7;
  return addDays(now, delta === 0 && forceNext ? 7 : delta);
}

function appendInterval(freq: string, interval: number): string {
  return interval > 1 ? `${freq};INTERVAL=${interval}` : freq;
}

function takePriority(text: string): { text: string; priority?: Priority } {
  const compact = text.match(/\b(?:p|!)\s*([1-3])\b/i);
  if (compact) {
    return {
      text: text.replace(compact[0], ' '),
      priority: Number(compact[1]) as Priority,
    };
  }

  const labelled = text.match(/\bpriority\s*([1-3])\b/i);
  if (labelled) {
    return {
      text: text.replace(labelled[0], ' '),
      priority: Number(labelled[1]) as Priority,
    };
  }

  const worded = text.match(/\b(high|medium|low)\s+priority\b/i);
  if (worded) {
    const word = worded[1]?.toLowerCase() ?? '';
    const priority = word === 'high' ? 1 : word === 'medium' ? 2 : 3;
    return { text: text.replace(worded[0], ' '), priority: priority as Priority };
  }

  return { text };
}

function takeFrequency(text: string): {
  text: string;
  recurrenceRule?: string;
  weekday?: number;
  everyWeekday?: boolean;
} {
  const next = text;

  const otherWeek = next.match(/\bevery\s+other\s+week\b/i);
  if (otherWeek) {
    return { text: next.replace(otherWeek[0], ' '), recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2' };
  }

  const interval = next.match(/\bevery\s+(\d+)\s+(day|week|month|year)s?\b/i);
  if (interval) {
    const count = Number(interval[1]);
    const unit = interval[2]?.toLowerCase() ?? '';
    const freq =
      unit === 'day'
        ? 'DAILY'
        : unit === 'week'
          ? 'WEEKLY'
          : unit === 'month'
            ? 'MONTHLY'
            : 'YEARLY';
    return {
      text: next.replace(interval[0], ' '),
      recurrenceRule: appendInterval(`FREQ=${freq}`, count),
    };
  }

  const weekday = next.match(
    /\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b/i,
  );
  if (weekday) {
    return {
      text: next.replace(weekday[0], ' '),
      recurrenceRule: 'FREQ=WEEKLY',
      weekday: WEEKDAYS[weekday[1]?.toLowerCase() ?? ''] ?? 0,
    };
  }

  const everyWeekday = next.match(/\bevery\s+week\s?day\b/i);
  if (everyWeekday) {
    return {
      text: next.replace(everyWeekday[0], ' '),
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      everyWeekday: true,
    };
  }

  const unit = next.match(/\bevery\s+(day|week|month|year)\b/i);
  if (unit) {
    const freq = unit[1]?.toLowerCase() ?? '';
    return {
      text: next.replace(unit[0], ' '),
      recurrenceRule: `FREQ=${freq === 'day' ? 'DAILY' : freq === 'week' ? 'WEEKLY' : freq === 'month' ? 'MONTHLY' : 'YEARLY'}`,
    };
  }

  // Bare "daily"/"weekly"/... only when it ends the sentence, so titles like
  // "Daily standup" keep their first word.
  const bare = next.match(/\b(daily|weekly|monthly|yearly|annually)\s*$/i);
  if (bare) {
    const word = bare[1]?.toLowerCase() ?? '';
    const freq =
      word === 'daily'
        ? 'DAILY'
        : word === 'weekly'
          ? 'WEEKLY'
          : word === 'monthly'
            ? 'MONTHLY'
            : 'YEARLY';
    return { text: next.replace(bare[0], ' '), recurrenceRule: `FREQ=${freq}` };
  }

  return { text: next };
}

function takeTime(text: string): { text: string; dueTime?: string } {
  let next = text;
  let tonight = false;

  if (/\btonight\b/i.test(next)) {
    tonight = true;
    next = next.replace(/\btonight\b/i, ' ');
  }

  const ampm = next.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (ampm) {
    let hours = Number(ampm[1]) % 12;
    if ((ampm[3] ?? '').toLowerCase() === 'pm') hours += 12;
    const minutes = Number(ampm[2] ?? 0);
    return {
      text: next.replace(ampm[0], ' '),
      dueTime: `${pad(hours)}:${pad(minutes)}`,
    };
  }

  const clock = next.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (clock) {
    return {
      text: next.replace(clock[0], ' '),
      dueTime: `${pad(Number(clock[1]))}:${clock[2]}`,
    };
  }

  const loose = next.match(/\bat\s+(\d{1,2})\b/i);
  if (loose) {
    const hours = Number(loose[1]);
    if (hours <= 23) {
      return {
        text: next.replace(loose[0], ' '),
        dueTime: `${pad(hours)}:00`,
      };
    }
  }

  if (tonight) return { text: next, dueTime: '20:00' };

  return { text: next };
}

function takeDate(
  text: string,
  now: Date,
  options: { weekday?: number; everyWeekday?: boolean; hasTime: boolean },
): { text: string; dueDate?: string } {
  const next = text;

  const iso = next.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return { text: next.replace(iso[0], ' '), dueDate: iso[0] };
  }

  const monthFirst = next.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  );
  if (monthFirst) {
    const month = MONTHS[monthFirst[1]?.toLowerCase() ?? ''] ?? 0;
    const day = Number(monthFirst[2]);
    const date = new Date(now.getFullYear(), month, day);
    if (!Number.isNaN(date.getTime())) {
      return { text: next.replace(monthFirst[0], ' '), dueDate: asDate(date) };
    }
  }

  const dayFirst = next.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
  );
  if (dayFirst) {
    const month = MONTHS[dayFirst[2]?.toLowerCase() ?? ''] ?? 0;
    const day = Number(dayFirst[1]);
    const date = new Date(now.getFullYear(), month, day);
    if (!Number.isNaN(date.getTime())) {
      return { text: next.replace(dayFirst[0], ' '), dueDate: asDate(date) };
    }
  }

  const slash = next.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    const rawYear = slash[3];
    const year = rawYear
      ? rawYear.length === 2
        ? 2000 + Number(rawYear)
        : Number(rawYear)
      : now.getFullYear();
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) {
      return { text: next.replace(slash[0], ' '), dueDate: asDate(date) };
    }
  }

  const dayAfter =
    next.match(/\bthe\s+day\s+after\s+tomorrow\b/i) ?? next.match(/\bday\s+after\s+tomorrow\b/i);
  if (dayAfter) {
    return { text: next.replace(dayAfter[0], ' '), dueDate: asDate(addDays(now, 2)) };
  }

  if (/\btomorrow\b/i.test(next)) {
    return { text: next.replace(/\btomorrow\b/i, ' '), dueDate: asDate(addDays(now, 1)) };
  }

  if (/\btoday\b/i.test(next)) {
    return { text: next.replace(/\btoday\b/i, ' '), dueDate: asDate(now) };
  }

  const inFuture = next.match(/\bin\s+(\d+)\s+(day|week|month|year)s?\b/i);
  if (inFuture) {
    const count = Number(inFuture[1]);
    const unit = inFuture[2]?.toLowerCase() ?? '';
    const date =
      unit === 'day'
        ? addDays(now, count)
        : unit === 'week'
          ? addWeeks(now, count)
          : unit === 'month'
            ? addMonths(now, count)
            : addYears(now, count);
    return { text: next.replace(inFuture[0], ' '), dueDate: asDate(date) };
  }

  if (/\bnext\s+week\b/i.test(next)) {
    return { text: next.replace(/\bnext\s+week\b/i, ' '), dueDate: asDate(addWeeks(now, 1)) };
  }

  if (/\bnext\s+month\b/i.test(next)) {
    return { text: next.replace(/\bnext\s+month\b/i, ' '), dueDate: asDate(addMonths(now, 1)) };
  }

  if (/\bnext\s+year\b/i.test(next)) {
    return { text: next.replace(/\bnext\s+year\b/i, ' '), dueDate: asDate(addYears(now, 1)) };
  }

  // "this Sunday" and "next Sunday" both remove the qualifier with the day;
  // only "next" forces a full week when today already is that weekday.
  const namedDay = next.match(
    /\b(?:(this|next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  );
  if (namedDay) {
    const date = weekdayOnOrAfter(
      now,
      WEEKDAYS[namedDay[2]?.toLowerCase() ?? ''] ?? 0,
      (namedDay[1] ?? '').toLowerCase() === 'next',
    );
    return { text: next.replace(namedDay[0], ' '), dueDate: asDate(date) };
  }

  if (options.weekday !== undefined) {
    return { text: next, dueDate: asDate(weekdayOnOrAfter(now, options.weekday)) };
  }

  if (options.everyWeekday) {
    let date = startOfDay(now);
    if (date.getDay() === 0) date = addDays(date, 1);
    if (date.getDay() === 6) date = addDays(date, 2);
    return { text: next, dueDate: asDate(date) };
  }

  if (options.hasTime) {
    return { text: next, dueDate: asDate(now) };
  }

  return { text: next };
}

function cleanTitle(value: string, fallback: string): string {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:.\-–—]+/, '')
    .replace(/[\s,;:.\-–—]+$/, '')
    .replace(/\b(?:on|at|by|due|for|from)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || fallback;
}

/**
 * Lightweight natural-language parsing for quick capture: "pay rent every
 * month at 9am p1" becomes a title plus recurrence, date/time and priority.
 * Ambiguous phrases are left in the title rather than guessed.
 */
export function parseTaskInput(input: string, now: Date = new Date()): ParsedTaskInput {
  const base = startOfDay(now);
  const original = input.trim();
  if (!original) return { title: '' };

  let text = original;
  const priority = takePriority(text);
  text = priority.text;

  const frequency = takeFrequency(text);
  text = frequency.text;

  const time = takeTime(text);
  text = time.text;

  const date = takeDate(text, base, {
    weekday: frequency.weekday,
    everyWeekday: frequency.everyWeekday,
    hasTime: time.dueTime !== undefined,
  });
  text = date.text;

  let dueDate = date.dueDate;
  const recurrenceRule = frequency.recurrenceRule;

  if (recurrenceRule && dueDate === undefined) {
    if (frequency.weekday !== undefined) {
      dueDate = asDate(weekdayOnOrAfter(base, frequency.weekday));
    } else if (frequency.everyWeekday) {
      let date = base;
      if (date.getDay() === 0) date = addDays(date, 1);
      if (date.getDay() === 6) date = addDays(date, 2);
      dueDate = asDate(date);
    } else {
      dueDate = asDate(base);
    }
  } else if (frequency.everyWeekday && dueDate === undefined) {
    dueDate = asDate(base);
  }

  const dueTime = time.dueTime;
  if (dueTime && dueDate === undefined) dueDate = asDate(base);

  return {
    title: cleanTitle(text, original),
    ...(priority.priority !== undefined ? { priority: priority.priority } : {}),
    ...(dueDate ? { dueDate } : {}),
    ...(dueTime ? { dueTime } : {}),
    ...(recurrenceRule ? { recurrenceRule } : {}),
  };
}
