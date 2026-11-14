import type { Task } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { pickTopTasks } from './autoAssign';

function task(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  const { id, title, ...rest } = overrides;

  return {
    id,
    title,
    notes: null,
    projectId: null,
    projectName: null,
    milestoneId: null,
    milestoneName: null,
    statusId: 'status',
    statusName: 'To do',
    statusCategory: 'open',
    priority: 3,
    startDate: null,
    endDate: null,
    dueDate: null,
    dueTime: null,
    estimateMinutes: null,
    recurrenceRule: null,
    recurrenceParentId: null,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tags: [],
    link: null,
    checklist: { done: 0, total: 0 },
    ...rest,
  };
}

describe('pickTopTasks', () => {
  it('orders by priority first, then In Progress before New', () => {
    const tasks = [
      task({ id: 'p3', title: 'P3', priority: 3 }),
      task({ id: 'p2', title: 'P2', priority: 2 }),
      task({ id: 'p1-new', title: 'P1 New', priority: 1 }),
      task({
        id: 'p1-progress',
        title: 'P1 Progress',
        priority: 1,
        statusName: 'In progress',
        statusCategory: 'active',
      }),
      task({
        id: 'p1-waiting',
        title: 'P1 Waiting',
        priority: 1,
        statusName: 'Waiting',
        statusCategory: 'active',
      }),
    ];

    expect(pickTopTasks(tasks).map((entry) => entry.id)).toEqual([
      'p1-progress',
      'p1-new',
      'p1-waiting',
    ]);
  });

  it('excludes done tasks and caps the result at three', () => {
    const tasks = [
      task({ id: 'done', title: 'Done', priority: 1, statusName: 'Done', statusCategory: 'done' }),
      ...Array.from({ length: 5 }, (_, index) =>
        task({ id: `task-${index}`, title: `Task ${index}`, priority: 2 }),
      ),
    ];

    expect(pickTopTasks(tasks)).toHaveLength(3);
    expect(pickTopTasks(tasks).some((entry) => entry.id === 'done')).toBe(false);
  });

  it('prefers earlier due dates and puts undated work last within the same rank', () => {
    const tasks = [
      task({ id: 'later', title: 'Later', dueDate: '2026-12-01' }),
      task({ id: 'undated', title: 'Undated' }),
      task({ id: 'sooner', title: 'Sooner', dueDate: '2026-11-20' }),
    ];

    expect(pickTopTasks(tasks).map((entry) => entry.id)).toEqual(['sooner', 'later', 'undated']);
  });
});
