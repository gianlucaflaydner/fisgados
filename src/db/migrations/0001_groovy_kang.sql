CREATE TABLE `session` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`started_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
DROP INDEX `idx_catches_caught_at`;--> statement-breakpoint
DROP INDEX `idx_catches_species`;--> statement-breakpoint
ALTER TABLE `catches` ADD `user_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_catches_user_caught_at` ON `catches` (`user_id`,`caught_at`);--> statement-breakpoint
CREATE INDEX `idx_catches_user_species` ON `catches` (`user_id`,`species_id`,`length_cm`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_unlocks` (
	`user_id` text NOT NULL,
	`species_id` text NOT NULL,
	`first_catch_id` text NOT NULL,
	`unlocked_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `species_id`)
);
--> statement-breakpoint
INSERT INTO `__new_unlocks`("user_id", "species_id", "first_catch_id", "unlocked_at") SELECT '', "species_id", "first_catch_id", "unlocked_at" FROM `unlocks`;--> statement-breakpoint
DROP TABLE `unlocks`;--> statement-breakpoint
ALTER TABLE `__new_unlocks` RENAME TO `unlocks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;