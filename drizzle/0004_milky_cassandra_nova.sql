DROP INDEX "projects_user_id_index";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "forked_from" text;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_forked_from_projects_id_fk" FOREIGN KEY ("forked_from") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_id_deleted_at_idx" ON "projects" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "forked_from_idx" ON "projects" USING btree ("forked_from");--> statement-breakpoint
CREATE INDEX "deleted_at_partial_idx" ON "projects" USING btree ("deleted_at") WHERE "projects"."deleted_at" IS NOT NULL;