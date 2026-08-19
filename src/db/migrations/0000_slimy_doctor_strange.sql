CREATE TABLE `catches` (
	`id` text PRIMARY KEY NOT NULL,
	`species_id` text,
	`length_cm` real NOT NULL,
	`weight_g` real,
	`weight_est_g` real,
	`photo_local` text NOT NULL,
	`photo_remote` text,
	`lat` real,
	`lng` real,
	`place_label` text,
	`released` integer DEFAULT false NOT NULL,
	`caught_at` text NOT NULL,
	`offline_origin` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`ai_suggestion` text,
	`ai_accepted` integer,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_catches_caught_at` ON `catches` (`caught_at`);--> statement-breakpoint
CREATE INDEX `idx_catches_species` ON `catches` (`species_id`,`length_cm`);--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `unlocks` (
	`species_id` text PRIMARY KEY NOT NULL,
	`first_catch_id` text NOT NULL,
	`unlocked_at` text NOT NULL
);
