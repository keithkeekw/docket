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
