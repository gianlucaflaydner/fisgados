CREATE TABLE `badges` (
	`user_id` text NOT NULL,
	`line_id` text NOT NULL,
	`tier` text NOT NULL,
	`awarded_at` text NOT NULL,
	`trigger_id` text,
	PRIMARY KEY(`user_id`, `line_id`, `tier`)
);
