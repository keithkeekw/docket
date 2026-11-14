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

/** One uploaded file stored against a task (FR-31). Bytes live on disk. */
export const taskAttachmentSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string(),
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
  /** When the work is planned to happen; the due date is the hard deadline. */
  startDate: localDateSchema.nullable(),
  endDate: localDateSchema.nullable(),
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
  attachments: z.array(taskAttachmentSchema),
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

export const taskAttachmentResponseSchema = z.object({
  attachment: taskAttachmentSchema,
});

export const taskTagsResponseSchema = z.object({
  tags: z.array(z.string()),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskDetail = z.infer<typeof taskDetailSchema>;
export type TaskList = z.infer<typeof taskListSchema>;
export type TaskLink = z.infer<typeof taskLinkSchema>;
export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
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
  startDate: localDateSchema.nullish(),
  endDate: localDateSchema.nullish(),
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
  startDate: localDateSchema.nullable().optional(),
  endDate: localDateSchema.nullable().optional(),
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

/** `POST /api/tasks/reorder` — ids in their new List order. */
export const reorderTasksBodySchema = z.strictObject({
  ids: z.array(z.string().min(1)).min(1).max(1000),
});

export const reorderTasksResponseSchema = z.object({
  reordered: z.number().int().nonnegative(),
});

/** `POST /api/tasks/bulk-delete` (FR-29) — one undo entry for the batch. */
export const bulkDeleteTasksBodySchema = z.strictObject({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export const bulkDeleteTasksResponseSchema = z.object({
  deleted: z.number().int().nonnegative(),
});

/** Logbook: reopen completed tasks in one go. */
export const bulkRestoreTasksBodySchema = bulkDeleteTasksBodySchema;

export const bulkRestoreTasksResponseSchema = z.object({
  restored: z.number().int().nonnegative(),
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
export type ReorderTasksBody = z.infer<typeof reorderTasksBodySchema>;
export type BulkDeleteTasksBody = z.infer<typeof bulkDeleteTasksBodySchema>;
export type BulkRestoreTasksBody = z.infer<typeof bulkRestoreTasksBodySchema>;

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

/** `POST /api/projects/:id/milestones/reorder` — every milestone id, in the new order. */
export const reorderMilestonesBodySchema = z.strictObject({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export const reorderMilestonesResponseSchema = z.object({
  reordered: z.number().int().nonnegative(),
});

/** `DELETE /api/milestones/:id` — its tasks move to the Inbox. */
export const deleteMilestoneResponseSchema = z.object({
  movedToInbox: z.number().int().nonnegative(),
});

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
export type CreateMilestoneBody = z.infer<typeof createMilestoneBodySchema>;
export type UpdateMilestoneBody = z.infer<typeof updateMilestoneBodySchema>;
export type ReorderMilestonesBody = z.infer<typeof reorderMilestonesBodySchema>;
export type DeleteMilestoneResponse = z.infer<typeof deleteMilestoneResponseSchema>;

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

/** List rows omit the Markdown body, which can be long. */
export const reviewSummarySchema = reviewSchema.omit({ contentMd: true });

export const reviewListSchema = z.object({
  reviews: z.array(reviewSummarySchema),
});

export const reviewResponseSchema = z.object({
  review: reviewSchema,
});

export const generateReviewBodySchema = z.strictObject({
  kind: z.enum(['daily', 'weekly', 'manual']),
});

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour HH:MM time');

/**
 * Settings → Reviews. Only the selected frequency is scheduled; each keeps its
 * own time so switching back restores it. `weeklyDay` is ISO (Monday 1 … Sunday 7).
 */
export const reviewScheduleSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['daily', 'weekly']),
  weeklyDay: z.number().int().min(1).max(7),
  dailyTime: clockTimeSchema,
  weeklyTime: clockTimeSchema,
});

export const updateReviewScheduleBodySchema = reviewScheduleSchema.partial().strict();

export type ReviewSchedule = z.infer<typeof reviewScheduleSchema>;
export type UpdateReviewScheduleBody = z.infer<typeof updateReviewScheduleBodySchema>;

export type ReviewSummary = z.infer<typeof reviewSummarySchema>;
export type ReviewList = z.infer<typeof reviewListSchema>;
export type ReviewKind = z.infer<typeof reviewSchema.shape.kind>;

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

// ---------------------------------------------------------------------------
// Backups (FR-27)
// ---------------------------------------------------------------------------

export const backupEntrySchema = z.object({
  /** Basename inside `data/backups`; never a path. */
  file: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const backupListSchema = z.object({
  backups: z.array(backupEntrySchema),
});

export const backupResponseSchema = z.object({
  backup: backupEntrySchema,
});

export const undoResponseSchema = z.object({
  label: z.string().nullable(),
});

export const restoreBodySchema = z.strictObject({
  file: z.string().min(1).max(255),
});

export const restoreResponseSchema = z.object({
  restored: z.string().min(1),
  /** Snapshot of the pre-restore state, so a wrong pick is recoverable. */
  safetyBackup: backupEntrySchema,
});

export type BackupEntry = z.infer<typeof backupEntrySchema>;
export type BackupList = z.infer<typeof backupListSchema>;

// ---------------------------------------------------------------------------
// AI settings (FR-24–FR-26) — never carries a key
// ---------------------------------------------------------------------------

export const aiFeatureSchema = z.enum([
  'capture',
  'breakdown',
  'summarize',
  'review_daily',
  'review_weekly',
  'chat',
]);

export const aiProviderSchema = z.enum([
  'deepseek',
  'openrouter',
  'openai',
  'gemini',
  'anthropic',
  'mistral',
  'qwen',
]);

/** Display and settings order. */
export const AI_PROVIDERS = aiProviderSchema.options;

/**
 * Which providers have a key on this machine. The key itself never leaves the
 * server: `source` says where it came from and `hint` is its last 4 characters.
 */
export const aiProviderStatusSchema = z.object({
  provider: aiProviderSchema,
  configured: z.boolean(),
  source: z.enum(['settings', 'env']).nullable(),
  hint: z.string().nullable(),
});

export const updateAiProviderKeyBodySchema = z.strictObject({
  apiKey: z.string().trim().min(1).max(500).regex(/^\S+$/, 'An API key cannot contain spaces'),
});

/** `provider: null` means the feature is not configured. */
export const aiFeatureSettingSchema = z.object({
  feature: aiFeatureSchema,
  provider: aiProviderSchema.nullable(),
  model: z.string().nullable(),
});

export const aiSettingsSchema = z.object({
  providers: z.array(aiProviderStatusSchema),
  features: z.array(aiFeatureSettingSchema),
});

export const updateAiSettingsBodySchema = z.strictObject({
  features: z
    .array(
      z.strictObject({
        feature: aiFeatureSchema,
        provider: aiProviderSchema.nullable(),
        model: z.string().trim().min(1).max(200).nullable(),
      }),
    )
    .min(1)
    .max(6),
});

export type AiFeature = z.infer<typeof aiFeatureSchema>;
export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiProviderStatus = z.infer<typeof aiProviderStatusSchema>;
export type AiFeatureSetting = z.infer<typeof aiFeatureSettingSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type UpdateAiSettingsBody = z.infer<typeof updateAiSettingsBodySchema>;
export type UpdateAiProviderKeyBody = z.infer<typeof updateAiProviderKeyBodySchema>;

/** Prompt catalogue shown in Settings → Prompt Management. */
export const promptEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** The prompt currently in use (custom override or built-in file). */
  content: z.string().min(1),
  /** The built-in prompt shipped with the app, used by Reset. */
  defaultContent: z.string().min(1),
  customized: z.boolean(),
});

export const promptListSchema = z.object({
  prompts: z.array(promptEntrySchema),
});

export const promptResponseSchema = z.object({
  prompt: promptEntrySchema,
});

export const updatePromptBodySchema = z.strictObject({
  content: z.string().trim().min(1).max(50_000),
});

export type PromptEntry = z.infer<typeof promptEntrySchema>;
export type PromptList = z.infer<typeof promptListSchema>;
export type UpdatePromptBody = z.infer<typeof updatePromptBodySchema>;

// ---------------------------------------------------------------------------
// Proposals (FR-23): every AI write goes through preview → edit → apply
// ---------------------------------------------------------------------------

export const proposalFeatureSchema = z.enum(['capture', 'breakdown', 'chat']);

export const proposalOpSchema = z.enum([
  'create_task',
  'update_task',
  'move_task',
  'delete_task',
  'create_project',
  'create_milestone',
]);

/** Resolved fields — IDs, not names; the model's names were mapped server-side. */
export const proposalItemFieldsSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().max(20_000).nullable().optional(),
  projectId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  statusId: z.string().optional(),
  priority: prioritySchema.optional(),
  dueDate: localDateSchema.nullable().optional(),
  dueTime: localTimeSchema.nullable().optional(),
  estimateMinutes: z.number().int().positive().nullable().optional(),
  /** A milestone proposed in the same proposal, referenced by name until it exists. */
  milestoneRef: z.string().min(1).max(200).nullable().optional(),
  /** A project proposed in the same proposal, referenced by name until it exists. */
  projectRef: z.string().min(1).max(200).nullable().optional(),
  /** Only for `create_project`. */
  description: z.string().max(5_000).optional(),
  targetDate: localDateSchema.nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  link: z
    .object({ url: z.string().min(1), label: z.string().min(1).max(40).optional() })
    .nullable()
    .optional(),
});

/** What the preview panel shows beside each field. */
export const proposalItemDisplaySchema = z.object({
  projectName: z.string().nullable(),
  milestoneName: z.string().nullable(),
  statusName: z.string().nullable(),
});

export const proposalItemSchema = z.object({
  id: z.string().min(1),
  op: proposalOpSchema,
  targetId: z.string().nullable().optional(),
  /** For `create_project` and `create_milestone`: the name later items point at. */
  ref: z.string().min(1).max(200).nullable().optional(),
  fields: proposalItemFieldsSchema,
  display: proposalItemDisplaySchema,
  /** Why the server guessed something — shown in a quiet note (DESIGN §4). */
  aiNote: z.string().nullable().optional(),
});

export const proposalStatusSchema = z.enum(['pending', 'applied', 'discarded']);

export const proposalSchema = z.object({
  id: z.string().min(1),
  feature: proposalFeatureSchema,
  inputText: z.string(),
  items: z.array(proposalItemSchema),
  status: proposalStatusSchema,
  createdAt: z.string(),
});

export const proposalResponseSchema = z.object({
  proposal: proposalSchema,
});

/** The user unticked items by removing them from the array (DESIGN §4). */
export const applyProposalBodySchema = z.strictObject({
  items: z.array(proposalItemSchema).max(50),
});

export const aiCaptureBodySchema = z.strictObject({
  text: z.string().trim().min(1).max(4_000),
  /** Capture context from a project, milestone or Kanban column. */
  projectId: z.string().min(1).optional(),
  statusId: z.string().min(1).optional(),
  milestoneId: z.string().min(1).optional(),
});

export const aiBreakdownBodySchema = z.strictObject({
  projectId: z.string().min(1),
});

/** Chat keeps its history client-side (there is no chat table in the schema). */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8_000),
});

export const aiChatBodySchema = z.strictObject({
  messages: z.array(chatMessageSchema).min(1).max(40),
});

export const aiChatResponseSchema = z.object({
  reply: z.string(),
  /** Present when the assistant prepared writes; shown in the preview modal. */
  proposal: proposalSchema.nullable(),
});

export const aiChecklistBodySchema = z.strictObject({
  taskId: z.string().min(1),
});

export const aiChecklistResponseSchema = z.object({
  items: z.array(z.string().min(1).max(200)),
});

export type AiChecklistResponse = z.infer<typeof aiChecklistResponseSchema>;

export const aiProjectSummaryBodySchema = z.strictObject({
  projectId: z.string().min(1),
});

export const aiProjectSummaryResponseSchema = z.object({
  summary: z.string(),
});

export type AiProjectSummaryResponse = z.infer<typeof aiProjectSummaryResponseSchema>;

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;

export type ProposalFeature = z.infer<typeof proposalFeatureSchema>;
export type ProposalOp = z.infer<typeof proposalOpSchema>;
export type ProposalItemFields = z.infer<typeof proposalItemFieldsSchema>;
export type ProposalItemDisplay = z.infer<typeof proposalItemDisplaySchema>;
export type ProposalItem = z.infer<typeof proposalItemSchema>;
export type Proposal = z.infer<typeof proposalSchema>;

// ---------------------------------------------------------------------------
// Updates (GitHub Releases)
// ---------------------------------------------------------------------------

export const updateReleaseSchema = z.object({
  tag: z.string().min(1),
  version: z.string().min(1),
  name: z.string(),
  url: z.string().url(),
  publishedAt: z.string(),
  notes: z.string(),
});

export const updateInfoSchema = z.object({
  currentVersion: z.string().min(1),
  repository: z.string().min(1),
  checkedAt: z.string(),
  updateAvailable: z.boolean(),
  latest: updateReleaseSchema.nullable(),
  /** A network/rate-limit failure while checking; the app remains usable. */
  checkError: z.string().nullable(),
  /** In-app updates check out release tags, so a downloaded copy without `.git` cannot install them. */
  gitCheckout: z.boolean(),
});

export type UpdateRelease = z.infer<typeof updateReleaseSchema>;
export type UpdateInfo = z.infer<typeof updateInfoSchema>;

export const updateApplyBodySchema = z.strictObject({
  tag: z.string().regex(/^v?\d+\.\d+\.\d+$/, 'Invalid release tag'),
});

export const updateApplyResponseSchema = z.object({
  accepted: z.literal(true),
});

export const updateStatusSchema = z.object({
  state: z.enum(['idle', 'requested', 'updating', 'done', 'error']),
  tag: z.string().nullable(),
  message: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});

export type UpdateApplyResponse = z.infer<typeof updateApplyResponseSchema>;
export type UpdateStatus = z.infer<typeof updateStatusSchema>;
