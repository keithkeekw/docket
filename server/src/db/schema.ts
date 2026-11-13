import { randomUUID } from 'node:crypto';
import { relations, sql } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * Schema for TECHSTACK.md §4.
 *
 * Conventions
 * - IDs: text UUIDs generated in the application layer.
 * - Timestamps (`created_at`, `updated_at`, `completed_at`, `opened_at`,
 *   `resolved_at`): ISO 8601 strings in UTC.
 * - Calendar values (`due_date`, `target_date`, `period_start`, `period_end`):
 *   `YYYY-MM-DD` local dates. `due_time` is `HH:mm` local wall-clock time.
 *   Keeping dates separate from UTC timestamps avoids off-by-one-day bugs in
 *   a single-timezone (KL) app.
 * - `updated_at` is set explicitly by services; there is no DB trigger.
 */

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID());
const createdAt = () =>
  text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString());
const updatedAt = () =>
  text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString());

// ---------------------------------------------------------------------------
// Statuses (FR-14) — one custom set used everywhere; category drives meaning.
// ---------------------------------------------------------------------------

export const statuses = sqliteTable(
  'statuses',
  {
    id: id(),
    name: text('name').notNull(),
    category: text('category', { enum: ['open', 'active', 'done'] }).notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [
    uniqueIndex('statuses_name_unique').on(t.name),
    index('statuses_position_idx').on(t.position),
    check('statuses_category_check', sql`${t.category} in ('open', 'active', 'done')`),
  ],
);

// ---------------------------------------------------------------------------
// Projects and milestones (FR-6, FR-7)
// ---------------------------------------------------------------------------

export const projects = sqliteTable(
  'projects',
  {
    id: id(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    targetDate: text('target_date'),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    aiExcluded: integer('ai_excluded', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('projects_archived_idx').on(t.archived),
    index('projects_position_idx').on(t.position),
  ],
);

export const milestones = sqliteTable(
  'milestones',
  {
    id: id(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    completedAt: text('completed_at'),
    createdAt: createdAt(),
  },
  (t) => [index('milestones_project_position_idx').on(t.projectId, t.position)],
);

// ---------------------------------------------------------------------------
// Tasks (FR-4). Inbox = project_id IS NULL.
// ---------------------------------------------------------------------------

export const tasks = sqliteTable(
  'tasks',
  {
    id: id(),
    title: text('title').notNull(),
    notes: text('notes'),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    milestoneId: text('milestone_id').references(() => milestones.id, {
      onDelete: 'set null',
    }),
    statusId: text('status_id')
      .notNull()
      .references(() => statuses.id, { onDelete: 'restrict' }),
    priority: integer('priority').notNull().default(3),
    dueDate: text('due_date'),
    dueTime: text('due_time'),
    estimateMinutes: integer('estimate_minutes'),
    recurrenceRule: text('recurrence_rule'),
    recurrenceParentId: text('recurrence_parent_id').references((): AnySQLiteColumn => tasks.id, {
      onDelete: 'set null',
    }),
    position: integer('position').notNull().default(0),
    completedAt: text('completed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('tasks_project_position_idx').on(t.projectId, t.position),
    index('tasks_status_idx').on(t.statusId),
    index('tasks_due_idx').on(t.dueDate, t.dueTime),
    index('tasks_completed_idx').on(t.completedAt),
    index('tasks_recurrence_parent_idx').on(t.recurrenceParentId),
    check('tasks_priority_check', sql`${t.priority} in (1, 2, 3)`),
    check('tasks_estimate_check', sql`${t.estimateMinutes} is null or ${t.estimateMinutes} > 0`),
    // `milestone_id must belong to project_id` is enforced in the service layer
    // (TECHSTACK §4). A DB-level CHECK here would block SQLite's ON DELETE SET
    // NULL ordering when a project is deleted.
  ],
);

// ---------------------------------------------------------------------------
// Checklist items, links, tags (FR-8, FR-16, FR-30)
// ---------------------------------------------------------------------------

export const checklistItems = sqliteTable(
  'checklist_items',
  {
    id: id(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('checklist_items_task_position_idx').on(t.taskId, t.position)],
);

export const taskLinks = sqliteTable(
  'task_links',
  {
    id: id(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    label: text('label').notNull(),
  },
  (t) => [index('task_links_task_idx').on(t.taskId)],
);

/**
 * Task attachments (FR-31). Files live on disk under `data/uploads`; the row
 * keeps the original name plus the generated storage name used on disk.
 */
export const taskAttachments = sqliteTable(
  'task_attachments',
  {
    id: id(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    storageName: text('storage_name').notNull(),
    mimeType: text('mime_type').notNull().default('application/octet-stream'),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('task_attachments_task_idx').on(t.taskId),
    uniqueIndex('task_attachments_storage_unique').on(t.storageName),
  ],
);

export const tags = sqliteTable(
  'tags',
  {
    id: id(),
    name: text('name').notNull(),
  },
  (t) => [uniqueIndex('tags_name_unique').on(t.name)],
);

export const taskTags = sqliteTable(
  'task_tags',
  {
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] }), index('task_tags_tag_idx').on(t.tagId)],
);

// ---------------------------------------------------------------------------
// Reviews, AI settings, app settings, proposals (M2/M3, created now so
// migrations stay stable — D12).
// ---------------------------------------------------------------------------

export const reviews = sqliteTable(
  'reviews',
  {
    id: id(),
    kind: text('kind', { enum: ['daily', 'weekly', 'manual'] }).notNull(),
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    contentMd: text('content_md').notNull(),
    model: text('model').notNull(),
    createdAt: createdAt(),
    openedAt: text('opened_at'),
  },
  (t) => [
    index('reviews_created_idx').on(t.createdAt),
    check('reviews_kind_check', sql`${t.kind} in ('daily', 'weekly', 'manual')`),
  ],
);

export const aiSettings = sqliteTable(
  'ai_settings',
  {
    feature: text('feature', {
      enum: ['capture', 'breakdown', 'review_daily', 'review_weekly', 'chat'],
    }).primaryKey(),
    provider: text('provider', { enum: ['deepseek', 'openrouter'] }).notNull(),
    model: text('model').notNull(),
  },
  (t) => [
    check(
      'ai_settings_feature_check',
      sql`${t.feature} in ('capture', 'breakdown', 'review_daily', 'review_weekly', 'chat')`,
    ),
    check('ai_settings_provider_check', sql`${t.provider} in ('deepseek', 'openrouter')`),
  ],
);

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const proposals = sqliteTable(
  'proposals',
  {
    id: id(),
    feature: text('feature', { enum: ['capture', 'breakdown', 'chat'] }).notNull(),
    inputText: text('input_text').notNull(),
    payloadJson: text('payload_json').notNull(),
    status: text('status', { enum: ['pending', 'applied', 'discarded'] })
      .notNull()
      .default('pending'),
    createdAt: createdAt(),
    resolvedAt: text('resolved_at'),
    acceptedCount: integer('accepted_count').notNull().default(0),
    editedCount: integer('edited_count').notNull().default(0),
  },
  (t) => [
    index('proposals_status_idx').on(t.status),
    check('proposals_feature_check', sql`${t.feature} in ('capture', 'breakdown', 'chat')`),
    check('proposals_status_check', sql`${t.status} in ('pending', 'applied', 'discarded')`),
  ],
);

// ---------------------------------------------------------------------------
// Relations (used by the relational query API in services and the AI tools).
// ---------------------------------------------------------------------------

export const statusesRelations = relations(statuses, ({ many }) => ({
  tasks: many(tasks),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  milestones: many(milestones),
  tasks: many(tasks),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, { fields: [milestones.projectId], references: [projects.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  milestone: one(milestones, { fields: [tasks.milestoneId], references: [milestones.id] }),
  status: one(statuses, { fields: [tasks.statusId], references: [statuses.id] }),
  checklistItems: many(checklistItems),
  links: many(taskLinks),
  attachments: many(taskAttachments),
  taskTags: many(taskTags),
  parent: one(tasks, {
    fields: [tasks.recurrenceParentId],
    references: [tasks.id],
    relationName: 'recurrence',
  }),
  occurrences: many(tasks, { relationName: 'recurrence' }),
}));

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  task: one(tasks, { fields: [checklistItems.taskId], references: [tasks.id] }),
}));

export const taskLinksRelations = relations(taskLinks, ({ one }) => ({
  task: one(tasks, { fields: [taskLinks.taskId], references: [tasks.id] }),
}));

export const taskAttachmentsRelations = relations(taskAttachments, ({ one }) => ({
  task: one(tasks, { fields: [taskAttachments.taskId], references: [tasks.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  taskTags: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));
