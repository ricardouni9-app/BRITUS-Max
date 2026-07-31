import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { organizations } from "./organizations.js";
import { cases } from "./cases.js";
import type { CaseTaskKind, CaseTaskStatus } from "@britus/contracts";

// Tarefas/prazos de um Caso — tenant-aware (`organization_id`) + FK ao Caso. Índice por
// (organização, caso) para as listagens do workflow e do dashboard.
export const caseTasks = pgTable(
  "case_tasks",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    caseId: uuid("case_id").notNull().references(() => cases.id),
    kind: text("kind").notNull().$type<CaseTaskKind>(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("open").$type<CaseTaskStatus>(),
    assignedUserId: uuid("assigned_user_id"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("case_tasks_org_case_idx").on(t.organizationId, t.caseId)],
);

export type CaseTaskRow = typeof caseTasks.$inferSelect;
