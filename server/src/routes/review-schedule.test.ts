import { reviewScheduleSchema } from '@app/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import type { Db } from '../db/types';
import { readSchedule } from '../services/settings';
import { createTestDb } from '../test/helpers';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;
let app: ReturnType<typeof createApp>;
let rescheduled: number;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
  rescheduled = 0;
  app = createApp(db, {
    onReviewScheduleChange: () => {
      rescheduled += 1;
    },
  });
});

afterEach(() => {
  sqlite.close();
});

function put(body: unknown) {
  return app.request('/api/settings/reviews', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/settings/reviews', () => {
  it('defaults to a daily review at 07:30 that is turned on', async () => {
    const response = await app.request('/api/settings/reviews');

    expect(response.status).toBe(200);
    expect(reviewScheduleSchema.parse(await response.json())).toEqual({
      enabled: true,
      frequency: 'daily',
      weeklyDay: 1,
      dailyTime: '07:30',
      weeklyTime: '07:30',
    });
  });
});

describe('PUT /api/settings/reviews', () => {
  it('saves a weekly schedule and reschedules the cron job', async () => {
    const response = await put({ frequency: 'weekly', weeklyDay: 5, weeklyTime: '16:45' });

    expect(response.status).toBe(200);
    expect(reviewScheduleSchema.parse(await response.json())).toMatchObject({
      enabled: true,
      frequency: 'weekly',
      weeklyDay: 5,
      weeklyTime: '16:45',
      dailyTime: '07:30',
    });
    expect(readSchedule(db)).toMatchObject({ frequency: 'weekly', weeklyDay: 5 });
    expect(rescheduled).toBe(1);
  });

  it('turns scheduled reviews off', async () => {
    const response = await put({ enabled: false });

    expect(response.status).toBe(200);
    expect(readSchedule(db).enabled).toBe(false);
  });

  it('rejects a bad time, day or frequency without rescheduling', async () => {
    for (const body of [
      { dailyTime: '24:00' },
      { weeklyTime: '7:30' },
      { weeklyDay: 0 },
      { weeklyDay: 8 },
      { frequency: 'monthly' },
      { unknown: true },
    ]) {
      expect((await put(body)).status).toBe(400);
    }
    expect(rescheduled).toBe(0);
  });
});
