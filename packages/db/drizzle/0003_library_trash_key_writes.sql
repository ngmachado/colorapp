ALTER TABLE "api_key" ADD COLUMN "writes" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_version" ADD COLUMN "deleted_at" timestamp with time zone;