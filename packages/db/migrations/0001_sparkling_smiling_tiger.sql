CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"person_type" text NOT NULL,
	"display_name" text NOT NULL,
	"cpf" text,
	"cnpj" text,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atendimentos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"channel_origin" text,
	"area_id" uuid,
	"work_type_id" uuid,
	"assigned_user_id" uuid,
	"status" text NOT NULL,
	"result" text,
	"non_conversion_reason" text,
	"converted_at" timestamp with time zone,
	"summary" text,
	"conflict_flag" boolean DEFAULT false NOT NULL,
	"first_contact_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_relevant_interaction_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"atendimento_id" uuid,
	"area_id" uuid NOT NULL,
	"work_type_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"financial_classification" text NOT NULL,
	"process_number" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_organization_id_idx" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_org_cpf_unique" ON "clients" USING btree ("organization_id","cpf") WHERE "clients"."cpf" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_org_cnpj_unique" ON "clients" USING btree ("organization_id","cnpj") WHERE "clients"."cnpj" is not null;--> statement-breakpoint
CREATE INDEX "atendimentos_organization_id_idx" ON "atendimentos" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cases_organization_id_idx" ON "cases" USING btree ("organization_id");