/** "Asia/Kuala_Lumpur" → "Kuala Lumpur". */
export function timeZoneLabel(zone: string): string {
  const parts = zone.split('/');
  return (parts[parts.length - 1] ?? zone).replace(/_/g, ' ');
}

export function formatClockTime(zone: string, now: Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
}

export function formatClockDay(zone: string, now: Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now);
}

export function formatClockOffset(zone: string, now: Date, locale = 'en'): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    timeZoneName: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
}
