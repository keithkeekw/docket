CREATE TABLE `ai_settings` (
	`feature` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	CONSTRAINT "ai_settings_feature_check" CHECK("ai_settings"."feature" in ('capture', 'breakdown', 'review_daily', 'review_weekly', 'chat')),
	CONSTRAINT "ai_settings_provider_check" CHECK("ai_settings"."provider" in ('deepseek', 'openrouter'))
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checklist_items_task_position_idx` ON `checklist_items` (`task_id`,`position`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `milestones_project_position_idx` ON `milestones` (`project_id`,`position`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`target_date` text,
	`archived` integer DEFAULT false NOT NULL,
	`ai_excluded` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_archived_idx` ON `projects` (`archived`);--> statement-breakpoint
CREATE INDEX `projects_position_idx` ON `projects` (`position`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`feature` text NOT NULL,
	`input_text` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`resolved_at` text,
	`accepted_count` integer DEFAULT 0 NOT NULL,
	`edited_count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "proposals_feature_check" CHECK("proposals"."feature" in ('capture', 'breakdown', 'chat')),
	CONSTRAINT "proposals_status_check" CHECK("proposals"."status" in ('pending', 'applied', 'discarded'))
);
--> statement-breakpoint
CREATE INDEX `proposals_status_idx` ON `proposals` (`status`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`content_md` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text NOT NULL,
	`opened_at` text,
	CONSTRAINT "reviews_kind_check" CHECK("reviews"."kind" in ('daily', 'weekly', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `reviews_created_idx` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE TABLE `statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "statuses_category_check" CHECK("statuses"."category" in ('open', 'active', 'done'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `statuses_name_unique` ON `statuses` (`name`);--> statement-breakpoint
CREATE INDEX `statuses_position_idx` ON `statuses` (`position`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `task_links` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`url` text NOT NULL,
	`label` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_links_task_idx` ON `task_links` (`task_id`);--> statement-breakpoint
CREATE TABLE `task_tags` (
	`task_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`task_id`, `tag_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_tags_tag_idx` ON `task_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`project_id` text,
	`milestone_id` text,
	`status_id` text NOT NULL,
	`priority` integer DEFAULT 3 NOT NULL,
	`due_date` text,
	`due_time` text,
	`estimate_minutes` integer,
	`recurrence_rule` text,
	`recurrence_parent_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`status_id`) REFERENCES `statuses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recurrence_parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "tasks_priority_check" CHECK("tasks"."priority" in (1, 2, 3)),
	CONSTRAINT "tasks_estimate_check" CHECK("tasks"."estimate_minutes" is null or "tasks"."estimate_minutes" > 0)
);
--> statement-breakpoint
CREATE INDEX `tasks_project_position_idx` ON `tasks` (`project_id`,`position`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status_id`);--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_date`,`due_time`);--> statement-breakpoint
CREATE INDEX `tasks_completed_idx` ON `tasks` (`completed_at`);--> statement-breakpoint
CREATE INDEX `tasks_recurrence_parent_idx` ON `tasks` (`recurrence_parent_id`);