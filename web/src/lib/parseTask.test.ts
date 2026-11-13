import { describe, expect, it } from 'vitest';
import { parseTaskInput } from './parseTask';

// Saturday, 14 November 2026, 10:00 local time.
const NOW = new Date(2026, 10, 14, 10, 0, 0);

describe('parseTaskInput', () => {
  it('leaves a plain title alone', () => {
    expect(parseTaskInput('Call mom', NOW)).toEqual({ title: 'Call mom' });
  });

  it('extracts a relative date and priority', () => {
    expect(parseTaskInput('Buy milk tomorrow p2', NOW)).toEqual({
      title: 'Buy milk',
      dueDate: '2026-11-15',
      priority: 2,
    });
  });

  it('extracts a monthly frequency and anchors it today', () => {
    expect(parseTaskInput('Pay rent every month p1', NOW)).toEqual({
      title: 'Pay rent',
      dueDate: '2026-11-14',
      recurrenceRule: 'FREQ=MONTHLY',
      priority: 1,
    });
  });

  it('turns a weekday frequency into weekly on the next matching day', () => {
    expect(parseTaskInput('Team sync every Monday at 9am', NOW)).toEqual({
      title: 'Team sync',
      dueDate: '2026-11-16',
      dueTime: '09:00',
      recurrenceRule: 'FREQ=WEEKLY',
    });
  });

  it('removes both "this" and the weekday from the title', () => {
    expect(parseTaskInput('Buy vegetables this Sunday', NOW)).toEqual({
      title: 'Buy vegetables',
      dueDate: '2026-11-15',
    });
  });

  it('handles next weekday plus a 12-hour time', () => {
    expect(parseTaskInput('Submit report next Friday 5pm p1', NOW)).toEqual({
      title: 'Submit report',
      dueDate: '2026-11-20',
      dueTime: '17:00',
      priority: 1,
    });
  });

  it('reads named dates and times', () => {
    expect(parseTaskInput('Dentist on 20 Nov at 3pm', NOW)).toEqual({
      title: 'Dentist',
      dueDate: '2026-11-20',
      dueTime: '15:00',
    });
  });

  it('reads daily at the end without eating "Daily standup"', () => {
    expect(parseTaskInput('Water plants daily', NOW)).toEqual({
      title: 'Water plants',
      dueDate: '2026-11-14',
      recurrenceRule: 'FREQ=DAILY',
    });
    expect(parseTaskInput('Daily standup', NOW)).toEqual({ title: 'Daily standup' });
  });

  it('reads an interval and slash dates', () => {
    expect(parseTaskInput('Review invoices every 2 weeks', NOW)).toEqual({
      title: 'Review invoices',
      dueDate: '2026-11-14',
      recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2',
    });
    expect(parseTaskInput('Finish taxes by 15/12 p1', NOW)).toEqual({
      title: 'Finish taxes',
      dueDate: '2026-12-15',
      priority: 1,
    });
  });

  it('reads weekday-only frequencies and in-N-days dates', () => {
    expect(parseTaskInput('Meeting every weekday', NOW)).toEqual({
      title: 'Meeting',
      dueDate: '2026-11-16',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    });
    expect(parseTaskInput('Plan sprint in 3 days', NOW)).toEqual({
      title: 'Plan sprint',
      dueDate: '2026-11-17',
    });
  });

  it('reads worded priorities and tonight', () => {
    expect(parseTaskInput('high priority: buy milk', NOW)).toEqual({
      title: 'buy milk',
      priority: 1,
    });
    expect(parseTaskInput('Call mom tonight at 9pm', NOW)).toEqual({
      title: 'Call mom',
      dueDate: '2026-11-14',
      dueTime: '21:00',
    });
  });
});
