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
  /** How many tasks use it — the settings screen explains a blocked delete. */
  taskCount: z.number().int().nonnegative(),
});

export const statusListSchema = z.object({
  statuses: z.array(statusSchema),
});

export const statusResponseSchema = z.object({
  status: statusSchema,
});

export type Status = z.infer<typeof statusSchema>;
export type StatusCategory = z.infer<typeof statusCategorySchema>;
export type StatusList = z.infer<typeof statusListSchema>;

export const createStatusBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(60),
  category: statusCategorySchema,
  position: z.number().int().nonnegative().optional(),
});

export const updateStatusBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(60).optional(),
  category: statusCategorySchema.optional(),
  position: z.number().int().nonnegative().optional(),
});

export type CreateStatusBody = z.infer<typeof createStatusBodySchema>;
export type UpdateStatusBody = z.infer<typeof updateStatusBodySchema>;

// ---------------------------------------------------------------------------
// Tasks (FR-4), checklist (FR-8), links (FR-16), tags (FR-30)
// ---------------------------------------------------------------------------

export const prioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Local calendar date, `YYYY-MM-DD` (PROGRESS D17). */
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Local wall-clock time, `HH:mm` (PROGRESS D17). */
export const localTimeSchema = z.string().regex(/^\d{2}:\d{2}$/);

/** One external link on a task; `label` is derived on save but editable. */
export const taskLinkSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  url: z.string().min(1),
  label: z.string().min(1),
});

export const checklistItemSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  title: z.string().min(1),
  done: z.boolean(),
  position: z.number().int(),
});

/** What a TaskRow shows: "☑ 1/4" without shipping the whole checklist. */
export const checklistProgressSchema = z.object({
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  notes: z.string().nullable(),
  projectId: z.string().nullable(),
  projectName: z.string().nullable(),
  milestoneId: z.string().nullable(),
  milestoneName: z.string().nullable(),
  statusId: z.string().min(1),
  statusName: z.string().min(1),
  statusCategory: statusCategorySchema,
  priority: prioritySchema,
  dueDate: localDateSchema.nullable(),
  dueTime: localTimeSchema.nullable(),
  estimateMinutes: z.number().int().positive().nullable(),
  recurrenceRule: z.string().nullable(),
  recurrenceParentId: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
  /** First link only — enough for the row badge. */
  link: taskLinkSchema.nullable(),
  checklist: checklistProgressSchema,
});

/** `GET /api/tasks/:id` — the drawer needs the full nested records. */
export const taskDetailSchema = taskSchema.extend({
  links: z.array(taskLinkSchema),
  checklistItems: z.array(checklistItemSchema),
});

export const taskListSchema = z.object({
  tasks: z.array(taskSchema),
});

export const taskResponseSchema = z.object({
  task: taskSchema,
});

export const taskDetailResponseSchema = z.object({
  task: taskDetailSchema,
});

export const checklistItemListSchema = z.object({
  items: z.array(checklistItemSchema),
});

export const checklistItemResponseSchema = z.object({
  item: checklistItemSchema,
});

export const taskLinkResponseSchema = z.object({
  link: taskLinkSchema,
});

export const taskTagsResponseSchema = z.object({
  tags: z.array(z.string()),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskDetail = z.infer<typeof taskDetailSchema>;
export type TaskList = z.infer<typeof taskListSchema>;
export type TaskLink = z.infer<typeof taskLinkSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
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
  recurrenceRule: z.string().trim().min(1).max(500).nullish(),
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
  recurrenceRule: z.string().trim().min(1).max(500).nullable().optional(),
});

export const completeTaskBodySchema = z.strictObject({
  done: z.boolean().default(true),
});

/** `POST /api/tasks/:id/move` (FR-5, US-3). */
export const moveTaskBodySchema = z.strictObject({
  projectId: z.string().min(1).nullable(),
  milestoneId: z.string().min(1).nullish(),
});

export const createChecklistItemBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(500),
  position: z.number().int().nonnegative().optional(),
});

export const updateChecklistItemBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(500).optional(),
  done: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const createTaskLinkBodySchema = z.strictObject({
  url: z.url().max(2_000),
  label: z.string().trim().min(1).max(40).optional(),
});

/** Tags are addressed by name so they can be created on the fly (FR-30). */
export const setTaskTagsBodySchema = z.strictObject({
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
});

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type MoveTaskBody = z.infer<typeof moveTaskBodySchema>;
export type CreateChecklistItemBody = z.infer<typeof createChecklistItemBodySchema>;
export type UpdateChecklistItemBody = z.infer<typeof updateChecklistItemBodySchema>;
export type CreateTaskLinkBody = z.infer<typeof createTaskLinkBodySchema>;

// ---------------------------------------------------------------------------
// Projects (FR-6, FR-9) and milestones (FR-7)
// ---------------------------------------------------------------------------

/**
 * Derived per request rather than stored (D8): done ÷ all tasks, the
 * lowest-position incomplete milestone, and the earliest due date still open.
 */
export const projectProgressSchema = z.object({
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  currentMilestone: z.object({ id: z.string().min(1), name: z.string().min(1) }).nullable(),
  nextDueTask: z
    .object({ id: z.string().min(1), title: z.string().min(1), dueDate: localDateSchema })
    .nullable(),
});

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  targetDate: localDateSchema.nullable(),
  archived: z.boolean(),
  aiExcluded: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectSummarySchema = projectSchema.extend({
  progress: projectProgressSchema,
});

export const projectListSchema = z.object({
  projects: z.array(projectSummarySchema),
});

export const projectResponseSchema = z.object({
  project: projectSummarySchema,
});

/** Milestone pill needs its task counts for "7 of 12" (DESIGN §4). */
export const milestoneSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  position: z.number().int(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const milestoneListSchema = z.object({
  milestones: z.array(milestoneSchema),
});

export const milestoneResponseSchema = z.object({
  milestone: milestoneSchema,
});

export type Project = z.infer<typeof projectSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectList = z.infer<typeof projectListSchema>;
export type ProjectProgress = z.infer<typeof projectProgressSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type MilestoneList = z.infer<typeof milestoneListSchema>;

export const createProjectBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5_000).optional(),
  targetDate: localDateSchema.nullish(),
});

export const updateProjectBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5_000).optional(),
  targetDate: localDateSchema.nullable().optional(),
  archived: z.boolean().optional(),
  aiExcluded: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const createMilestoneBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  position: z.number().int().nonnegative().optional(),
});

export const updateMilestoneBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(200).optional(),
  position: z.number().int().nonnegative().optional(),
  completedAt: z.string().nullable().optional(),
});

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
export type CreateMilestoneBody = z.infer<typeof createMilestoneBodySchema>;
export type UpdateMilestoneBody = z.infer<typeof updateMilestoneBodySchema>;

// ---------------------------------------------------------------------------
// Tags (FR-30)
// ---------------------------------------------------------------------------

export const tagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const tagListSchema = z.object({
  tags: z.array(tagSchema),
});

export type Tag = z.infer<typeof tagSchema>;
export type TagList = z.infer<typeof tagListSchema>;

// ---------------------------------------------------------------------------
// Reviews (FR-19–FR-21) and the dashboard (FR-17)
// ---------------------------------------------------------------------------

/** Not generated until M3; the dashboard renders the card only when present. */
export const reviewSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['daily', 'weekly', 'manual']),
  periodStart: localDateSchema,
  periodEnd: localDateSchema,
  contentMd: z.string(),
  model: z.string(),
  createdAt: z.string(),
  openedAt: z.string().nullable(),
});

export type Review = z.infer<typeof reviewSchema>;

export const dashboardCountsSchema = z.object({
  overdue: z.number().int().nonnegative(),
  today: z.number().int().nonnegative(),
  inbox: z.number().int().nonnegative(),
});

/**
 * `GET /api/dashboard` (TECHSTACK §5). Groups are capped for a fast first
 * paint while `counts` stays exact, so the header line never lies.
 */
export const dashboardSchema = z.object({
  date: localDateSchema,
  counts: dashboardCountsSchema,
  groups: z.object({
    overdue: z.array(taskSchema),
    today: z.array(taskSchema),
    inbox: z.array(taskSchema),
  }),
  activeProjects: z.array(projectSummarySchema),
  latestReview: reviewSchema.nullable(),
});

export type Dashboard = z.infer<typeof dashboardSchema>;
export type DashboardCounts = z.infer<typeof dashboardCountsSchema>;

