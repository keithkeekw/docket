import { z } from 'zod';

/**
 * Shapes shared by the API and the web app. Zod is the single source of truth:
 * the server validates with these schemas and the client parses responses with
 * the same objects, so a shape change breaks type-checking in both places.
 */

/** Counts shown beside the sidebar navigation items. Open work only. */
export const navCountsSchema = z.object({
  inbox: z.number().int().nonnegative(),
  today: z.number().int().nonnegative(),
  all: z.number().int().nonnegative(),
});

/** One entry in the sidebar's project list. */
export const navProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

/** `GET /api/nav` — everything the app shell needs to render. */
export const navSummarySchema = z.object({
  counts: navCountsSchema,
  projects: z.array(navProjectSchema),
});

export type NavCounts = z.infer<typeof navCountsSchema>;
export type NavProject = z.infer<typeof navProjectSchema>;
export type NavSummary = z.infer<typeof navSummarySchema>;

// ---------------------------------------------------------------------------
// Statuses (FR-14)
// ---------------------------------------------------------------------------

export const statusCategorySchema = z.enum(['open', 'active', 'done']);

export const statusSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: statusCategorySchema,
  position: z.number().int(),
});

export const statusListSchema = z.object({
  statuses: z.array(statusSchema),
});

export type Status = z.infer<typeof statusSchema>;
export type StatusCategory = z.infer<typeof statusCategorySchema>;
export type StatusList = z.infer<typeof statusListSchema>;

// ---------------------------------------------------------------------------
// Tasks (FR-4)
// ---------------------------------------------------------------------------

export const prioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Local calendar date, `YYYY-MM-DD` (PROGRESS D17). */
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Local wall-clock time, `HH:mm` (PROGRESS D17). */
export const localTimeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  notes: z.string().nullable(),
  projectId: z.string().nullable(),
  projectName: z.string().nullable(),
  milestoneId: z.string().nullable(),
  statusId: z.string().min(1),
  statusName: z.string().min(1),
  statusCategory: statusCategorySchema,
  priority: prioritySchema,
  dueDate: localDateSchema.nullable(),
  dueTime: localTimeSchema.nullable(),
  estimateMinutes: z.number().int().positive().nullable(),
  recurrenceRule: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taskListSchema = z.object({
  tasks: z.array(taskSchema),
});

export const taskResponseSchema = z.object({
  task: taskSchema,
});

export type Task = z.infer<typeof taskSchema>;
export type TaskList = z.infer<typeof taskListSchema>;
export type Priority = z.infer<typeof prioritySchema>;

/**
 * Request bodies. `null` clears an optional field, `undefined` (absent) leaves
 * it unchanged on PATCH.
 */
export const createTaskBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(500),
  notes: z.string().max(20_000).nullish(),
  statusId: z.string().min(1).nullish(),
  priority: prioritySchema.nullish(),
  dueDate: localDateSchema.nullish(),
  dueTime: localTimeSchema.nullish(),
  estimateMinutes: z.number().int().positive().max(100_000).nullish(),
  projectId: z.string().min(1).nullish(),
  milestoneId: z.string().min(1).nullish(),
});

export const updateTaskBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(500).optional(),
  notes: z.string().max(20_000).nullable().optional(),
  statusId: z.string().min(1).optional(),
  priority: prioritySchema.optional(),
  dueDate: localDateSchema.nullable().optional(),
  dueTime: localTimeSchema.nullable().optional(),
  estimateMinutes: z.number().int().positive().max(100_000).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  milestoneId: z.string().min(1).nullable().optional(),
});

export const completeTaskBodySchema = z.strictObject({
  done: z.boolean().default(true),
});

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
