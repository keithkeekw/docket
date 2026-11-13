/**
 * Recurrence presets (FR-15, US-11). The stored value is an RFC 5545 rule
 * string; "weekly" repeats on the due date's weekday because `dtstart` is the
 * task's own due date (see the server's recurrence service).
 */
export type RecurrencePreset = { value: string; label: string };

export const RECURRENCE_PRESETS: readonly RecurrencePreset[] = [
  { value: '', label: 'Does not repeat' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=WEEKLY;INTERVAL=2', label: 'Every 2 weeks' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
];

function ruleParts(rule: string): Record<string, string> {
  const entries = rule
    .split(';')
    .map((part) => part.split('='))
    .filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0]));

  return Object.fromEntries(entries.map(([key, value]) => [key.toUpperCase(), value.toUpperCase()]));
}

/**
 * Human label for a stored rule ("Weekly", "Every 2 weeks"), or "Custom" for a
 * rule the presets do not cover so the UI never pretends to understand it.
 */
export function describeRecurrence(rule: string | null | undefined): string | null {
  if (!rule) return null;

  const preset = RECURRENCE_PRESETS.find((entry) => entry.value === rule);
  if (preset) return preset.label;

  const parts = ruleParts(rule);
  const interval = Number(parts.INTERVAL ?? '1');

  switch (parts.FREQ) {
    case 'DAILY':
      return interval > 1 ? `Every ${interval} days` : 'Daily';
    case 'WEEKLY':
      return interval > 1 ? `Every ${interval} weeks` : 'Weekly';
    case 'MONTHLY':
      return interval > 1 ? `Every ${interval} months` : 'Monthly';
    case 'YEARLY':
      return interval > 1 ? `Every ${interval} years` : 'Yearly';
    default:
      return 'Custom';
  }
}

/** The select options, including the task's own rule when it is not a preset. */
export function recurrenceOptions(rule: string | null | undefined): RecurrencePreset[] {
  const options = [...RECURRENCE_PRESETS];
  if (rule && !options.some((option) => option.value === rule)) {
    options.push({ value: rule, label: `Custom (${describeRecurrence(rule) ?? 'rule'})` });
  }
  return options;
}
