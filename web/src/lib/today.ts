import { format } from 'date-fns';

/**
 * Today as a local `YYYY-MM-DD` string (PROGRESS D17). Kept identical to the
 * server's helper so filters built here match the values stored there.
 */
export function localDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}
