import type { Task } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { groupTasks, sortTasks } from './table';

function task(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    notes: null,
    projectId: null,
    projectName: null,
    milestoneId: null,
    milestoneName: null,
    statusId: 'todo',
    statusName: 'To do',
    statusCategory: 'open',
    priority: 3,
    dueDate: null,
    dueTime: null,
    estimateMinutes: null,
    recurrenceRule: null,
    recurrenceParentId: null,
    completedAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    tags: [],
    link: null,
    checklist: { done: 0, total: 0 },
    ...overrides,
  };
}

const alpha = task({ id: 'a', title: 'Alpha', dueDate: '2026-11-20', priority: 2 });
const beta = task({ id: 'b', title: 'Beta', dueDate: '2026-11-10', priority: 1 });
const undated = task({ id: 'c', title: 'Charlie', priority: 3 });

describe('sortTasks', () => {
  it('returns the original order without a sort', () => {
    expect(sortTasks([alpha, beta], null)).toEqual([alpha, beta]);
  });

  it('sorts by title and reverses on desc', () => {
    expect(sortTasks([undated, beta, alpha], { key: 'title', dir: 'asc' }).map((t) => t.title)).toEqual([
      'Alpha',
      'Beta',
      'Charlie',
    ]);
    expect(sortTasks([alpha, beta], { key: 'title', dir: 'desc' }).map((t) => t.title)).toEqual([
      'Beta',
      'Alpha',
    ]);
  });

  it('keeps undated tasks last in both directions', () => {
    expect(sortTasks([undated, alpha, beta], { key: 'due', dir: 'asc' }).map((t) => t.title)).toEqual([
      'Beta',
      'Alpha',
      'Charlie',
    ]);
    expect(sortTasks([undated, alpha, beta], { key: 'due', dir: 'desc' }).map((t) => t.title)).toEqual([
      'Charlie',
      'Alpha',
      'Beta',
    ]);
  });

  it('sorts by priority numerically', () => {
    expect(sortTasks([undated, alpha, beta], { key: 'priority', dir: 'asc' }).map((t) => t.priority)).toEqual([
      1, 2, 3,
    ]);
  });

  it('treats a missing estimate as the largest value', () => {
    const withEstimate = task({ id: 'd', title: 'Delta', estimateMinutes: 30 });
    expect(
      sortTasks([undated, withEstimate], { key: 'estimate', dir: 'asc' }).map((t) => t.title),
    ).toEqual(['Delta', 'Charlie']);
  });
});

describe('groupTasks', () => {
  const projectTask = task({ id: 'p', title: 'Project work', projectId: 'proj', projectName: 'Onboarding' });
  const inboxTask = task({ id: 'i', title: 'Inbox work' });

  it('returns one unnamed group when grouping is off', () => {
    const groups = groupTasks([projectTask, inboxTask], 'none');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.tasks).toHaveLength(2);
  });

  it('groups by project with Inbox as its own group', () => {
    const groups = groupTasks([projectTask, inboxTask], 'project');
    expect(groups.map((group) => group.label)).toEqual(['Onboarding', 'Inbox']);
  });

  it('groups by status and priority', () => {
    const done = task({ id: 'd', title: 'Done work', statusId: 'done', statusName: 'Done', statusCategory: 'done' });
    expect(groupTasks([projectTask, done], 'status').map((group) => group.label)).toEqual(['To do', 'Done']);
    expect(groupTasks([alpha, beta], 'priority').map((group) => group.label)).toEqual(['P2', 'P1']);
  });

  it('keeps the order inside a group', () => {
    const second = task({ id: 'p2', title: 'Second', projectId: 'proj', projectName: 'Onboarding' });
    const groups = groupTasks([projectTask, second], 'project');
    expect(groups[0]?.tasks.map((entry) => entry.title)).toEqual(['Project work', 'Second']);
  });
});
