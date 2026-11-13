import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { milestones, projects, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';
import { addLink } from './links';
import { createMilestone, deleteMilestone } from './milestones';
import { createProject, deleteProject, getProject } from './projects';
import { addChecklistItem } from './checklist';
import { setTaskTags } from './tags';
import { createTask, deleteTask, getTaskDetail } from './tasks';
import { clearUndo, runUndo, undoLabel } from './undo';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
  clearUndo();
});

afterEach(() => {
  sqlite.close();
});

function statusId(name: string): string {
  const row = db.select({ id: statuses.id }).from(statuses).where(eq(statuses.name, name)).get();
  if (!row) throw new Error(`no status ${name}`);
  return row.id;
}

const baseTask = { title: 'Restorable', statusId: '' };

describe('undo a deleted task', () => {
  it('brings back the task with its tags, links and checklist', () => {
    const task = createTask(db, { ...baseTask, statusId: statusId('To do'), dueDate: '2026-11-20' });
    setTaskTags(db, task.id, ['vendor', 'important']);
    addLink(db, task.id, { url: 'https://acme.zendesk.com/agent/tickets/48213' });
    addChecklistItem(db, task.id, { title: 'Outline' });
    addChecklistItem(db, task.id, { title: 'Review' });

    deleteTask(db, task.id);
    expect(undoLabel()).toBe('Task “Restorable” deleted');
    expect(db.select().from(tasks).all()).toHaveLength(0);

    expect(runUndo()).toBe('Task “Restorable” deleted');

    const restored = getTaskDetail(db, task.id);
    expect(restored.title).toBe('Restorable');
    expect(restored.tags).toEqual(['important', 'vendor']);
    expect(restored.links.map((link) => link.label)).toEqual(['ZD-48213']);
    expect(restored.checklistItems.map((item) => item.title)).toEqual(['Outline', 'Review']);
  });

  it('only remembers the most recent action', () => {
    const first = createTask(db, { ...baseTask, title: 'First', statusId: statusId('To do') });
    const second = createTask(db, { ...baseTask, title: 'Second', statusId: statusId('To do') });

    deleteTask(db, first.id);
    deleteTask(db, second.id);

    expect(undoLabel()).toBe('Task “Second” deleted');
    runUndo();
    expect(runUndo()).toBeNull();
    // The slot held the second delete, so that is the one restored.
    expect(db.select().from(tasks).all().map((task) => task.title)).toEqual(['Second']);
  });
});

describe('undo a deleted project', () => {
  it('restores the project, its milestones and the task links', () => {
    const project = createProject(db, { name: 'Onboarding', description: 'Week one' });
    const milestone = createMilestone(db, project.id, { name: 'Phase 1' });
    const task = createTask(db, {
      title: 'Draft the doc',
      statusId: statusId('To do'),
      projectId: project.id,
      milestoneId: milestone.id,
    });

    deleteProject(db, project.id);
    expect(undoLabel()).toBe('Project “Onboarding” deleted');
    expect(db.select().from(projects).all()).toHaveLength(0);

    runUndo();

    const restored = getProject(db, project.id);
    expect(restored.name).toBe('Onboarding');
    expect(db.select().from(milestones).where(eq(milestones.projectId, project.id)).all()).toHaveLength(1);

    const relinked = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(relinked?.projectId).toBe(project.id);
    expect(relinked?.milestoneId).toBe(milestone.id);
  });
});

describe('undo a deleted milestone', () => {
  it('puts the milestone back and re-links its tasks', () => {
    const project = createProject(db, { name: 'Onboarding' });
    const milestone = createMilestone(db, project.id, { name: 'Phase 1' });
    const task = createTask(db, {
      title: 'Draft the doc',
      statusId: statusId('To do'),
      projectId: project.id,
      milestoneId: milestone.id,
    });

    deleteMilestone(db, milestone.id);

    expect(db.select().from(milestones).all()).toHaveLength(0);
    expect(db.select().from(tasks).where(eq(tasks.id, task.id)).get()?.milestoneId).toBeNull();

    runUndo();

    expect(db.select().from(milestones).all()).toHaveLength(1);
    expect(db.select().from(tasks).where(eq(tasks.id, task.id)).get()?.milestoneId).toBe(
      milestone.id,
    );
  });
});

describe('undo bookkeeping', () => {
  it('is empty when nothing destructive happened', () => {
    expect(undoLabel()).toBeNull();
    expect(runUndo()).toBeNull();
  });
});
