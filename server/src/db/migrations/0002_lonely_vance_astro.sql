PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ai_settings` (
	`feature` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	CONSTRAINT "ai_settings_feature_check" CHECK("__new_ai_settings"."feature" in ('capture', 'breakdown', 'summarize', 'review_daily', 'review_weekly', 'chat')),
	CONSTRAINT "ai_settings_provider_check" CHECK("__new_ai_settings"."provider" in ('deepseek', 'openrouter'))
);
--> statement-breakpoint
INSERT INTO `__new_ai_settings`("feature", "provider", "model") SELECT "feature", "provider", "model" FROM `ai_settings`;--> statement-breakpoint
DROP TABLE `ai_settings`;--> statement-breakpoint
ALTER TABLE `__new_ai_settings` RENAME TO `ai_settings`;--> statement-breakpoint
-- Keep the project Summarize button working for installs that used the old
-- shared "capture" configuration; it can be changed independently afterwards.
INSERT OR IGNORE INTO `ai_settings` (`feature`, `provider`, `model`)
SELECT 'summarize', `provider`, `model` FROM `ai_settings` WHERE `feature` = 'capture';--> statement-breakpoint
PRAGMA foreign_keys=ON;