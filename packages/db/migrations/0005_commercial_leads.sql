CREATE TABLE "commercial_leads" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "segment" text,
  "source" text NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "consent_at" timestamp with time zone NOT NULL,
  "contacted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "commercial_leads_email_idx" ON "commercial_leads" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "commercial_leads_status_idx" ON "commercial_leads" USING btree ("status");
