import type { Proposal } from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Completion } from '../ai/client';
import { createApp } from '../app';
import { milestones, projects, proposals as proposalsTable, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';
import {
  applyProposal,
  breakdownProposal,
  captureProposal,
  discardProposal,
  getProposal,
} from '../services/proposals';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
  app = createApp(db);
});

afterEach(() => {
  sqlite.close();
});

function projection(tasks: unknown[]) {
  return {
    text: JSON.stringify({ tasks }),
    model: 'stub-model',
  };
}

/** Records the user messages so retry behaviour can be asserted. */
function stub(...replies: unknown[]): { complete: Completion; calls: string[] } {
  const calls: string[] = [];
  let index = 0;

  return {
    calls,
    complete: async (request) => {
      calls.push(request.user);
      const reply = replies[Math.min(index, replies.length - 1)];
      index += 1;
      return typeof reply === 'string' ? { text: reply, model: 'stub-model' } : projection(reply as unknown[]);
    },
  };
}

const NOW = new Date(2026, 10, 13, 9, 0); // Fri 13 Nov 2026

function statusId(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`no status ${name}`);
  return row.id;
}

describe('captureProposal', () => {
  it('turns free text into a pending proposal using the model JSON', async () => {
    const { complete } = stub([
      {
        title: 'Reply to ZD-48213',
        priority: 1,
        dueDate: '2026-11-14',
        dueTime: '10:00',
        estimateMinutes: 30,
      },
    ]);

    const proposal = await captureProposal(db, 'reply to ZD-48213 tomorrow 10am p1 30m', {
      complete,
      now: NOW,
    });

    expect(proposal).toMatchObject({ feature: 'capture', status: 'pending' });
    expect(proposal.items[0]?.fields).toMatchObject({
      title: 'Reply to ZD-48213',
      priority: 1,
      dueDate: '2026-11-14',
      dueTime: '10:00',
      estimateMinutes: 30,
      projectId: null,
    });
    expect(proposal.items[0]?.aiNote).toBeNull();
  });

  it('resolves project, milestone and status names to ids', async () => {
    const project = db.insert(projects).values({ name: 'Onboarding' }).returning().get();
    const milestone = db
      .insert(milestones)
      .values({ projectId: project.id, name: 'Phase 1' })
      .returning()
      .get();

    const { complete } = stub([
      {
        title: 'Draft the welcome doc',
        project: 'onboarding',
        milestone: 'phase 1',
        status: 'Waiting',
        tags: ['docs', 'docs', 'week 1'],
      },
    ]);

    const proposal = await captureProposal(db, 'draft the welcome doc', { complete, now: NOW });
    const item = proposal.items[0];

    expect(item?.fields).toMatchObject({
      projectId: project.id,
      milestoneId: milestone.id,
      statusId: statusId('Waiting'),
      tags: ['docs', 'week 1'],
    });
    expect(item?.display).toEqual({
      projectName: 'Onboarding',
      milestoneName: 'Phase 1',
      statusName: 'Waiting',
    });
  });

  it('keeps work out of AI-excluded projects and explains why', async () => {
    db.insert(projects).values({ name: 'Client secrets', aiExcluded: true }).run();

    const { complete } = stub([{ title: 'Scrub the logs', project: 'Client secrets' }]);
    const proposal = await captureProposal(db, 'scrub the logs', { complete, now: NOW });

    expect(proposal.items[0]?.fields.projectId).toBeNull();
    expect(proposal.items[0]?.aiNote).toContain('excluded from AI');
  });

  it('retries once with the validation error before giving up', async () => {
    const { complete, calls } = stub('not json at all', [{ title: 'Second time lucky' }]);

    const proposal = await captureProposal(db, 'something', { complete, now: NOW });

    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('was rejected');
    expect(proposal.items[0]?.fields.title).toBe('Second time lucky');
  });

  it('fails with 502 when both replies are unusable', async () => {
    const { complete } = stub('{ "tasks": [] }', 'nonsense');

    await expect(captureProposal(db, 'something', { complete, now: NOW })).rejects.toMatchObject({
      status: 502,
    });
  });

  it('fails with 503 when capture is not configured', async () => {
    await expect(captureProposal(db, 'something')).rejects.toMatchObject({ status: 503 });
  });
});

describe('applyProposal', () => {
  async function pendingProposal(): Promise<Proposal> {
    const { complete } = stub([
      {
        title: 'Draft the welcome doc',
        priority: 2,
        dueDate: '2026-11-20',
        tags: ['docs'],
        link: { url: 'https://acme.atlassian.net/browse/OPS-112' },
      },
      { title: 'Book the venue' },
    ]);

    return captureProposal(db, 'two tasks', { complete, now: NOW });
  }

  it('creates every ticked task in one go', async () => {
    const proposal = await pendingProposal();

    const applied = applyProposal(db, proposal.id, proposal.items);

    expect(applied.status).toBe('applied');
    const rows = db.select().from(tasks).all();
    expect(rows.map((row) => row.title).sort()).toEqual(['Book the venue', 'Draft the welcome doc']);

    const draft = rows.find((row) => row.title === 'Draft the welcome doc');
    expect(draft).toMatchObject({ priority: 2, dueDate: '2026-11-20' });
  });

  it('leaves unticked items out', async () => {
    const proposal = await pendingProposal();
    const kept = proposal.items.slice(0, 1);

    applyProposal(db, proposal.id, kept);

    expect(db.select().from(tasks).all().map((row) => row.title)).toEqual(['Draft the welcome doc']);
  });

  it('rolls everything back when one item is invalid', async () => {
    const proposal = await pendingProposal();
    const items = [
      proposal.items[0]!,
      {
        ...proposal.items[1]!,
        fields: { ...proposal.items[1]!.fields, projectId: 'does-not-exist' },
      },
    ];

    expect(() => applyProposal(db, proposal.id, items)).toThrow();

    expect(db.select().from(tasks).all()).toHaveLength(0);
    expect(getProposal(db, proposal.id).status).toBe('pending');
  });

  it('refuses to apply the same proposal twice', async () => {
    const proposal = await pendingProposal();
    applyProposal(db, proposal.id, proposal.items);

    expect(() => applyProposal(db, proposal.id, proposal.items)).toThrow(/already handled/);
  });

  it('counts edited titles for the success metric', async () => {
    const proposal = await pendingProposal();
    const items = proposal.items.map((item) => ({
      ...item,
      fields: { ...item.fields, title: `${item.fields.title} (edited)` },
    }));

    applyProposal(db, proposal.id, items);

    const row = db
      .select({ editedCount: proposalsTable.editedCount, acceptedCount: proposalsTable.acceptedCount })
      .from(proposalsTable)
      .where(eq(proposalsTable.id, proposal.id))
      .get();

    expect(row).toEqual({ editedCount: 2, acceptedCount: 2 });
  });
});

describe('discardProposal', () => {
  it('marks the proposal discarded and writes nothing', async () => {
    const { complete } = stub([{ title: 'Never mind' }]);
    const proposal = await captureProposal(db, 'never mind', { complete, now: NOW });

    const discarded = discardProposal(db, proposal.id);

    expect(discarded.status).toBe('discarded');
    expect(db.select().from(tasks).all()).toHaveLength(0);
  });
});

describe('POST /api/ai/capture', () => {
  it('rejects empty text', async () => {
    const response = await app.request('/api/ai/capture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '   ' }),
    });

    expect(response.status).toBe(400);
  });

  it('says AI is not configured instead of failing oddly', async () => {
    const response = await app.request('/api/ai/capture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'reply to the vendor' }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('not set up') });
  });
});


describe('breakdownProposal', () => {
  const breakdownReply = {
    milestones: [{ name: 'Phase 1 — foundations' }, { name: 'Phase 2 — rollout' }],
    tasks: [
      {
        title: 'Draft the welcome doc',
        milestone: 'phase 1 — foundations',
        priority: 2,
        estimateMinutes: 45,
      },
      { title: 'Book the venue', milestone: 'Phase 1 — foundations' },
      { title: 'Announce to the company', milestone: 'Phase 2 — rollout' },
    ],
  };

  function stubBreakdown(reply: unknown) {
    return async () => ({ text: JSON.stringify(reply), model: 'stub-model' });
  }

  async function project(name = 'Onboarding', aiExcluded = false) {
    return db.insert(projects).values({ name, aiExcluded }).returning().get();
  }

  it('proposes milestones first, then tasks that point at them', async () => {
    const row = await project();

    const proposal = await breakdownProposal(db, row.id, {
      complete: stubBreakdown(breakdownReply),
      now: NOW,
    });

    expect(proposal.feature).toBe('breakdown');
    expect(proposal.items.map((item) => item.op)).toEqual([
      'create_milestone',
      'create_milestone',
      'create_task',
      'create_task',
      'create_task',
    ]);

    const task = proposal.items[2];
    expect(task?.fields).toMatchObject({
      title: 'Draft the welcome doc',
      projectId: row.id,
      priority: 2,
      estimateMinutes: 45,
      milestoneRef: 'Phase 1 — foundations',
    });
    expect(task?.display.milestoneName).toBe('Phase 1 — foundations');
  });

  it('creates the milestones and links the tasks to them on apply', async () => {
    const row = await project();
    const proposal = await breakdownProposal(db, row.id, {
      complete: stubBreakdown(breakdownReply),
      now: NOW,
    });

    applyProposal(db, proposal.id, proposal.items);

    const milestoneRows = db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, row.id))
      .all();
    expect(milestoneRows.map((milestone) => milestone.name).sort()).toEqual([
      'Phase 1 — foundations',
      'Phase 2 — rollout',
    ]);

    const taskRows = db.select().from(tasks).all();
    expect(taskRows).toHaveLength(3);

    const byName = (title: string) => taskRows.find((task) => task.title === title);
    const phaseOne = milestoneRows.find((m) => m.name === 'Phase 1 — foundations');
    const phaseTwo = milestoneRows.find((m) => m.name === 'Phase 2 — rollout');

    expect(byName('Draft the welcome doc')?.milestoneId).toBe(phaseOne?.id);
    expect(byName('Announce to the company')?.milestoneId).toBe(phaseTwo?.id);
  });

  it('leaves a task at project level when its milestone is unticked', async () => {
    const row = await project();
    const proposal = await breakdownProposal(db, row.id, {
      complete: stubBreakdown(breakdownReply),
      now: NOW,
    });

    const withoutMilestones = proposal.items.filter((item) => item.op !== 'create_milestone');
    applyProposal(db, proposal.id, withoutMilestones);

    expect(db.select().from(milestones).all()).toHaveLength(0);
    for (const task of db.select().from(tasks).all()) {
      expect(task.milestoneId).toBeNull();
      expect(task.projectId).toBe(row.id);
    }
  });

  it('reuses an existing milestone instead of proposing a duplicate', async () => {
    const row = await project();
    db.insert(milestones).values({ projectId: row.id, name: 'Phase 1 — foundations' }).run();

    const proposal = await breakdownProposal(db, row.id, {
      complete: stubBreakdown(breakdownReply),
      now: NOW,
    });

    const created = proposal.items.filter((item) => item.op === 'create_milestone');
    expect(created.map((item) => item.fields.title)).toEqual(['Phase 2 — rollout']);
  });

  it('refuses an excluded or archived project', async () => {
    const excluded = await project('Client secrets', true);
    await expect(
      breakdownProposal(db, excluded.id, { complete: stubBreakdown(breakdownReply), now: NOW }),
    ).rejects.toMatchObject({ status: 400 });

    const archived = db
      .insert(projects)
      .values({ name: 'Old', archived: true })
      .returning()
      .get();
    await expect(
      breakdownProposal(db, archived.id, { complete: stubBreakdown(breakdownReply), now: NOW }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('fails with 503 when breakdown is not configured', async () => {
    const row = await project();
    await expect(breakdownProposal(db, row.id)).rejects.toMatchObject({ status: 503 });
  });
});
