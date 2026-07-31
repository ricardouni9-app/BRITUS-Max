import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const commercialLeads = pgTable("commercial_leads", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  segment: text("segment"),
  source: text("source").notNull(),
  status: text("status").notNull().default("new"),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("commercial_leads_email_idx").on(t.email), index("commercial_leads_status_idx").on(t.status)]);

export type CommercialLeadRow = typeof commercialLeads.$inferSelect;
