CREATE TABLE `task_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`filename` text NOT NULL,
	`storage_name` text NOT NULL,
	`mime_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_attachments_task_idx` ON `task_attachments` (`task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_attachments_storage_unique` ON `task_attachments` (`storage_name`);