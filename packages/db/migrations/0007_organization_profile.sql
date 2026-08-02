ALTER TABLE "organizations" ADD COLUMN "legal_name" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tax_id" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "email" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "phone" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "address_line" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "city" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "state" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "postal_code" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "profile_completed_at" timestamp with time zone;
