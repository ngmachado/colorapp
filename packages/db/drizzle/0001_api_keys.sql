CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"month_window" text,
	"month_count" integer DEFAULT 0 NOT NULL,
	"minute_window" text,
	"minute_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_hash" ON "api_key" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "api_key_owner" ON "api_key" USING btree ("owner_id");