import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Completion, ToolChat, ToolChatResult } from '../ai/client';
import { runChatTool } from '../ai/chat-tools';
import { projects, proposals as proposalsTable, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';
import { chat } from './chat';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
});

afterEach(() => {
  sqlite.close();
});

function statusId(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`no status ${name}`);
  return row.id;
}

function task(title: string, extra: Record<string, unknown> = {}) {
  const row = db
    .insert(tasks)
    .values({ title, statusId: statusId('To do'), ...extra })
    .returning()
    .get();
  return row;
}

describe('runChatTool', () => {
  it('lists open tasks and hides AI-excluded projects', () => {
    const visible = db.insert(projects).values({ name: 'Onboarding' }).returning().get();
    const hidden = db
      .insert(projects)
      .values({ name: 'Client secrets', aiExcluded: true })
      .returning()
      .get();

    task('Visible work', { projectId: visible.id });
    task('Hidden work', { projectId: hidden.id });

    const result = runChatTool(db, 'list_tasks', JSON.stringify({ openOnly: true }));
    const parsed = JSON.parse(result.content) as { tasks: Array<{ title: string }> };

    expect(parsed.tasks.map((entry) => entry.title)).toEqual(['Visible work']);
  });

  it('filters overdue tasks', () => {
    task('Late', { dueDate: '2020-01-01' });
    task('Later', { dueDate: '2999-01-01' });

    const result = runChatTool(db, 'list_tasks', JSON.stringify({ overdue: true }));
    const parsed = JSON.parse(result.content) as { tasks: Array<{ title: string }> };

    expect(parsed.tasks.map((entry) => entry.title)).toEqual(['Late']);
  });

  it('refuses a task in an excluded project', () => {
    const hidden = db
      .insert(projects)
      .values({ name: 'Client secrets', aiExcluded: true })
      .returning()
      .get();
    const row = task('Secret work', { projectId: hidden.id });

    const result = runChatTool(db, 'get_task', JSON.stringify({ id: row.id }));
    expect(result.content).toContain('excluded from AI');
  });

  it('returns project progress without excluded projects', () => {
    db.insert(projects).values({ name: 'Onboarding' }).run();
    db.insert(projects).values({ name: 'Hidden', aiExcluded: true }).run();

    const result = runChatTool(db, 'list_projects', '{}');
    const parsed = JSON.parse(result.content) as { projects: Array<{ name: string }> };

    expect(parsed.projects.map((project) => project.name)).toEqual(['Onboarding']);
  });

  it('prepares a pending proposal instead of writing tasks', () => {
    const project = db.insert(projects).values({ name: 'Onboarding' }).returning().get();

    const result = runChatTool(
      db,
      'propose_tasks',
      JSON.stringify({ tasks: [{ title: 'Draft the doc', project: 'Onboarding', priority: 2 }] }),
    );

    expect(result.content).toContain('Prepared 1 task');
    expect(result.proposal?.items[0]?.fields).toMatchObject({
      title: 'Draft the doc',
      projectId: project.id,
      priority: 2,
    });

    // Nothing written yet.
    expect(db.select().from(tasks).all()).toHaveLength(0);
    expect(db.select().from(proposalsTable).all()).toHaveLength(1);
  });

  it('survives broken tool arguments', () => {
    expect(runChatTool(db, 'list_tasks', 'not json').content).toContain('not valid JSON');
    expect(runChatTool(db, 'nope', '{}').content).toContain('Unknown tool');
  });
});

describe('chat', () => {
  function scripted(...steps: ToolChatResult[]): { toolChat: ToolChat; calls: number } {
    const state = { calls: 0 };
    return {
      get calls() {
        return state.calls;
      },
      toolChat: async () => {
        const step = steps[Math.min(state.calls, steps.length - 1)];
        state.calls += 1;
        if (!step) throw new Error('no step');
        return step;
      },
    } as { toolChat: ToolChat; calls: number };
  }

  it('runs a tool call and answers with the model text', async () => {
    task('Book the venue');

    const script = scripted(
      {
        text: '',
        model: 'stub',
        toolCalls: [{ id: 'call-1', name: 'list_tasks', arguments: JSON.stringify({ openOnly: true }) }],
      },
      { text: 'You have one open task: Book the venue.', model: 'stub', toolCalls: [] },
    );

    const result = await chat(db, [{ role: 'user', content: 'What is open?' }], {
      toolChat: script.toolChat,
    });

    expect(result.reply).toContain('Book the venue');
    expect(result.proposal).toBeNull();
    expect(script.calls).toBe(2);
  });

  it('returns the proposal the assistant prepared', async () => {
    const script = scripted(
      {
        text: '',
        model: 'stub',
        toolCalls: [
          {
            id: 'call-1',
            name: 'propose_tasks',
            arguments: JSON.stringify({ tasks: [{ title: 'Send the welcome note' }] }),
          },
        ],
      },
      { text: 'I prepared one task for you to review.', model: 'stub', toolCalls: [] },
    );

    const result = await chat(db, [{ role: 'user', content: 'Add a task' }], {
      toolChat: script.toolChat,
    });

    expect(result.reply).toContain('review');
    expect(result.proposal?.feature).toBe('chat');
    expect(result.proposal?.status).toBe('pending');
    expect(db.select().from(tasks).all()).toHaveLength(0);
  });

  it('falls back to a summary answer when the provider rejects tools', async () => {
    task('Book the venue');

    const toolChat: ToolChat = async () => {
      throw new Error('tools are not supported');
    };
    const complete: Completion = async (request) => ({
      text: `Summary answer with ${request.system.includes('Book the venue') ? 'data' : 'no data'}`,
      model: 'stub',
    });

    const result = await chat(db, [{ role: 'user', content: 'What is open?' }], {
      toolChat,
      complete,
    });

    expect(result.reply).toContain('data');
    expect(result.proposal).toBeNull();
  });

  it('surfaces a missing configuration instead of falling back', async () => {
    await expect(chat(db, [{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({ status: 503 });
  });
});
