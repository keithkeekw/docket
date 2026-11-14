/**
 * Calendar values in this app are local `YYYY-MM-DD` strings (PROGRESS D17).
 * The server and the browser run on the same machine (NFR-1), so the server's
 * local calendar day is the user's calendar day.
 */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** English weekday name for a local date. Models miscount weekdays from a bare date. */
export function localWeekday(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/** "Friday, 13 November", for headings the model should copy rather than compute. */
export function localDayLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
