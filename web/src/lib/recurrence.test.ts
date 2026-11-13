import { describe, expect, it } from 'vitest';
import { describeRecurrence, RECURRENCE_PRESETS, recurrenceOptions } from './recurrence';

describe('describeRecurrence', () => {
  it('names the presets', () => {
    expect(describeRecurrence('FREQ=DAILY')).toBe('Daily');
    expect(describeRecurrence('FREQ=WEEKLY')).toBe('Weekly');
    expect(describeRecurrence('FREQ=WEEKLY;INTERVAL=2')).toBe('Every 2 weeks');
    expect(describeRecurrence('FREQ=MONTHLY')).toBe('Monthly');
  });

  it('returns null when there is no rule', () => {
    expect(describeRecurrence(null)).toBeNull();
    expect(describeRecurrence('')).toBeNull();
  });

  it('reads intervals and other part orders', () => {
    expect(describeRecurrence('INTERVAL=3;FREQ=WEEKLY')).toBe('Every 3 weeks');
    expect(describeRecurrence('FREQ=DAILY;INTERVAL=2')).toBe('Every 2 days');
    expect(describeRecurrence('FREQ=YEARLY')).toBe('Yearly');
  });

  it('accepts a weekday rule as weekly', () => {
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=MO,WE')).toBe('Weekly');
  });

  it('falls back to Custom for something it does not understand', () => {
    expect(describeRecurrence('EVERY OTHER TUESDAY')).toBe('Custom');
  });
});

describe('recurrenceOptions', () => {
  it('offers the presets for a task with no rule', () => {
    expect(recurrenceOptions(null)).toHaveLength(RECURRENCE_PRESETS.length);
    expect(recurrenceOptions(null)[0]).toEqual({ value: '', label: 'Does not repeat' });
  });

  it('keeps a stored rule that is not a preset selectable', () => {
    const options = recurrenceOptions('FREQ=WEEKLY;BYDAY=MO');
    expect(options).toHaveLength(RECURRENCE_PRESETS.length + 1);
    expect(options.at(-1)).toEqual({ value: 'FREQ=WEEKLY;BYDAY=MO', label: 'Custom (Weekly)' });
  });

  it('does not duplicate a preset', () => {
    expect(recurrenceOptions('FREQ=DAILY')).toHaveLength(RECURRENCE_PRESETS.length);
  });
});
